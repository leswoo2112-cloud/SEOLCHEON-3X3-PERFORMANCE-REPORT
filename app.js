/* =========================================================
   SEOLCHEON 3X3 ANALYTICS
   app.js
========================================================= */

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const STORAGE_KEY = "SEOLCHEON_3X3_ANALYTICS_V1";

const PAGE_NAMES = {
  dashboard: "Dashboard",
  live: "Live Game",
  games: "Game Center",
  shot: "Shot Lab",
  pass: "Pass Lab",
  possession: "Possession Lab",
  players: "Player Lab",
  lineups: "Lineup Lab",
  gameflow: "Game Flow",
  scouting: "Scouting",
  tactics: "Tactics Lab",
  video: "Video Lab",
  insights: "Performance Insights",
  training: "Training",
  league: "League",
  reports: "Report PRO",
  data: "Data Center",
  settings: "Settings"
};


/* =========================================================
   HELPERS
========================================================= */

const $ = selector => document.querySelector(selector);

const $$ = selector =>
  [...document.querySelectorAll(selector)];


function clone(value) {
  return JSON.parse(JSON.stringify(value));
}


function uid(prefix = "id") {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}


function safeNumber(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}


function percent(made, attempts) {

  if (!attempts) {
    return 0;
  }

  return (
    made /
    attempts *
    100
  );

}


function formatPercent(value) {

  if (!Number.isFinite(value)) {
    return "0%";
  }

  return (
    value.toFixed(1) +
    "%"
  );

}


function formatClock(seconds) {

  const safe =
    Math.max(
      0,
      Math.floor(seconds)
    );

  const minutes =
    Math.floor(
      safe / 60
    );

  const secs =
    safe % 60;

  return (
    String(minutes)
      .padStart(2, "0") +
    ":" +
    String(secs)
      .padStart(2, "0")
  );

}


function escapeHTML(text = "") {

  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function showToast(message) {

  const toast = $("#toast");

  if (!toast) return;

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 1700);

}


/* =========================================================
   PLAYER
========================================================= */

function createPlayer(
  number,
  name,
  team = "home"
) {

  return {

    id: uid("player"),

    number,

    name,

    team,

    active: true,

    secondsPlayed: 0,

    stats: {

      pts: 0,

      onePM: 0,
      onePA: 0,

      twoPM: 0,
      twoPA: 0,

      ast: 0,

      oreb: 0,
      dreb: 0,

      stl: 0,
      blk: 0,

      tov: 0,
      foul: 0,

      passes: 0,

      screens: 0,

      plusMinus: 0

    }

  };

}


/* =========================================================
   INITIAL STATE
========================================================= */

function createInitialState() {

  return {

    currentPage:
      "dashboard",

    currentGame:
      null,

    selectedPlayerId:
      null,

    possession:
      "home",

    games: [],

    history: [],

    future: [],

    settings: {

      gameSeconds: 600,

      shotClockSeconds: 12,

      autoSave: true

    }

  };

}


let state =
  loadState();


/* =========================================================
   STORAGE
========================================================= */

function loadState() {

  try {

    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) {
      return createInitialState();
    }

    const parsed =
      JSON.parse(saved);

    return {
      ...createInitialState(),
      ...parsed
    };

  }

  catch (error) {

    console.error(
      "저장 데이터 로딩 실패:",
      error
    );

    return createInitialState();

  }

}


function saveState() {

  if (
    state.settings
      ?.autoSave === false
  ) {
    return;
  }

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );

  }

  catch (error) {

    console.error(
      "자동 저장 실패:",
      error
    );

  }

}


/* =========================================================
   HISTORY
========================================================= */

function createHistorySnapshot() {

  return clone({

    currentGame:
      state.currentGame,

    selectedPlayerId:
      state.selectedPlayerId,

    possession:
      state.possession

  });

}


function pushHistory() {

  state.history.push(
    createHistorySnapshot()
  );

  if (
    state.history.length >
    100
  ) {

    state.history.shift();

  }

  state.future = [];

}


function undo() {

  if (
    state.history.length === 0
  ) {

    showToast(
      "취소할 기록이 없습니다."
    );

    return;
  }

  state.future.push(
    createHistorySnapshot()
  );

  const previous =
    state.history.pop();

  state.currentGame =
    previous.currentGame;

  state.selectedPlayerId =
    previous.selectedPlayerId;

  state.possession =
    previous.possession;

  renderAll();

  showToast(
    "마지막 기록을 취소했습니다."
  );

}


function redo() {

  if (
    state.future.length === 0
  ) {

    showToast(
      "다시 실행할 기록이 없습니다."
    );

    return;
  }

  state.history.push(
    createHistorySnapshot()
  );

  const next =
    state.future.pop();

  state.currentGame =
    next.currentGame;

  state.selectedPlayerId =
    next.selectedPlayerId;

  state.possession =
    next.possession;

  renderAll();

  showToast(
    "기록을 다시 적용했습니다."
  );

}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

function openPage(page) {

  if (!PAGE_NAMES[page]) {
    return;
  }

  state.currentPage =
    page;

  $$(".page")
    .forEach(element => {

      element.classList.toggle(
        "active",
        element.id === page
      );

    });


  $$(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });


  const title =
    $("#pageTitle");

  if (title) {

    title.textContent =
      PAGE_NAMES[page];

  }


  saveState();

  renderPage(page);

}


/* =========================================================
   NEW GAME
========================================================= */

function openNewGameModal() {

  const modal =
    $("#newGameModal");

  if (!modal) return;


  $("#setupGameDate").value =
    new Date()
      .toISOString()
      .slice(0, 10);


  $("#setupHomeTeam").value =
    "설천고";


  createRosterInputs();


  modal.classList.remove(
    "hidden"
  );

}


function closeNewGameModal() {

  $("#newGameModal")
    ?.classList
    .add("hidden");

}


function createRosterInputs() {

  const home =
    $("#homeRosterSetup");

  const away =
    $("#awayRosterSetup");

  if (!home || !away) {
    return;
  }


  home.innerHTML =
    createRosterHTML(
      "home"
    );

  away.innerHTML =
    createRosterHTML(
      "away"
    );

}


function createRosterHTML(team) {

  return [1, 2, 3, 4, 5]
    .map((_, index) => {

      return `

        <div class="roster-player">

          <input
            class="roster-number"
            data-team="${team}"
            data-index="${index}"
            type="number"
            min="0"
            max="99"
            value="${index + 1}"
            placeholder="번호"
          >

          <input
            class="roster-name"
            data-team="${team}"
            data-index="${index}"
            value="${
              index < 3
                ? `선수 ${index + 1}`
                : ""
            }"
            placeholder="선수 이름"
          >

        </div>

      `;

    })
    .join("");

}


/* =========================================================
   CREATE GAME
========================================================= */

function createGameFromModal() {

  const homeName =
    $("#setupHomeTeam")
      ?.value
      .trim() ||
    "설천고";

  const awayName =
    $("#setupAwayTeam")
      ?.value
      .trim() ||
    "상대팀";

  const gameDate =
    $("#setupGameDate")
      ?.value ||
    new Date()
      .toISOString()
      .slice(0, 10);

  const gameName =
    $("#setupGameName")
      ?.value
      .trim() ||
    `${homeName} vs ${awayName}`;


  const homePlayers =
    readRoster(
      "home"
    );

  const awayPlayers =
    readRoster(
      "away"
    );


  if (
    homePlayers.length < 3
  ) {

    showToast(
      "설천고 선수는 최소 3명이 필요합니다."
    );

    return;

  }


  if (
    awayPlayers.length < 3
  ) {

    showToast(
      "상대팀 선수는 최소 3명이 필요합니다."
    );

    return;

  }


  state.history = [];
  state.future = [];

  state.selectedPlayerId =
    null;

  state.possession =
    "home";


  state.currentGame = {

    id:
      uid("game"),

    name:
      gameName,

    date:
      gameDate,

    createdAt:
      Date.now(),

    status:
      "live",

    home: {

      name:
        homeName,

      score:
        0,

      fouls:
        0,

      timeouts:
        1,

      players:
        homePlayers

    },

    away: {

      name:
        awayName,

      score:
        0,

      fouls:
        0,

      timeouts:
        1,

      players:
        awayPlayers

    },

    gameSeconds:
      state.settings
        .gameSeconds,

    shotSeconds:
      state.settings
        .shotClockSeconds,

    clockRunning:
      false,

    possessions: {

      home:
        0,

      away:
        0

    },

    events: [],

    shots: [],

    passes: [],

    lineups: [],

    possessionLog: [],

    videoTags: [],

    scoutingNotes: [],

    trainingRecommendations: []

  };


  closeNewGameModal();

  saveState();

  openPage(
    "live"
  );

  renderAll();

  showToast(
    "새 경기가 생성되었습니다."
  );

}


function readRoster(team) {

  const numbers =
    $$(
      `.roster-number[data-team="${team}"]`
    );

  const names =
    $$(
      `.roster-name[data-team="${team}"]`
    );


  const players = [];


  names.forEach(
    (input, index) => {

      const name =
        input.value.trim();

      if (!name) {
        return;
      }

      const number =
        safeNumber(
          numbers[index]
            ?.value
        );

      players.push(
        createPlayer(
          number,
          name,
          team
        )
      );

    }
  );


  return players;

}


/* =========================================================
   PLAYER HELPERS
========================================================= */

function getAllPlayers() {

  if (!state.currentGame) {
    return [];
  }

  return [

    ...state.currentGame
      .home.players,

    ...state.currentGame
      .away.players

  ];

}


function getPlayerById(id) {

  return getAllPlayers()
    .find(
      player =>
        player.id === id
    );

}


function getSelectedPlayer() {

  if (
    !state.selectedPlayerId
  ) {
    return null;
  }

  return getPlayerById(
    state.selectedPlayerId
  );

}


function getPlayerTeam(
  player
) {

  if (!player) {
    return null;
  }

  return (
    player.team === "home"
      ? state.currentGame.home
      : state.currentGame.away
  );

}


/* =========================================================
   LIVE EVENT
========================================================= */

function recordEvent(type) {

  const game =
    state.currentGame;

  if (!game) {

    showToast(
      "먼저 새 경기를 생성해주세요."
    );

    return;

  }


  const player =
    getSelectedPlayer();


  if (!player) {

    showToast(
      "선수를 먼저 선택해주세요."
    );

    return;

  }


  pushHistory();


  const team =
    getPlayerTeam(player);

  const stats =
    player.stats;


  let description = "";


  switch (type) {

    case "1PM":

      stats.pts += 1;

      stats.onePM += 1;

      stats.onePA += 1;

      team.score += 1;

      description =
        "1점 성공";

      createShotRecord(
        player,
        1,
        true
      );

      break;


    case "2PM":

      stats.pts += 2;

      stats.twoPM += 1;

      stats.twoPA += 1;

      team.score += 2;

      description =
        "2점 성공";

      createShotRecord(
        player,
        2,
        true
      );

      break;


    case "MISS":

      stats.onePA += 1;

      description =
        "슛 실패";

      createShotRecord(
        player,
        1,
        false
      );

      break;


    case "AST":

      stats.ast += 1;

      description =
        "어시스트";

      break;


    case "OREB":

      stats.oreb += 1;

      description =
        "공격 리바운드";

      break;


    case "DREB":

      stats.dreb += 1;

      description =
        "수비 리바운드";

      break;


    case "STL":

      stats.stl += 1;

      description =
        "스틸";

      break;


    case "BLK":

      stats.blk += 1;

      description =
        "블록";

      break;


    case "TOV":

      stats.tov += 1;

      description =
        "턴오버";

      endPossession(
        player.team,
        "turnover"
      );

      break;


    case "FOUL":

      stats.foul += 1;

      team.fouls += 1;

      description =
        "파울";

      break;


    case "PASS":

      stats.passes += 1;

      description =
        "패스";

      createPassRecord(
        player
      );

      break;


    case "SCREEN":

      stats.screens += 1;

      description =
        "스크린";

      break;


    default:
      return;

  }


  game.events.unshift({

    id:
      uid("event"),

    type,

    playerId:
      player.id,

    playerName:
      player.name,

    playerNumber:
      player.number,

    team:
      player.team,

    gameSeconds:
      game.gameSeconds,

    shotSeconds:
      game.shotSeconds,

    scoreHome:
      game.home.score,

    scoreAway:
      game.away.score,

    description,

    createdAt:
      Date.now()

  });


  updatePlusMinus();

  saveState();

  renderAll();

}


/* =========================================================
   SHOTS
========================================================= */

function createShotRecord(
  player,
  value,
  made
) {

  state.currentGame
    .shots
    .push({

      id:
        uid("shot"),

      playerId:
        player.id,

      team:
        player.team,

      value,

      made,

      x: null,

      y: null,

      zone: null,

      quality: null,

      playType: null,

      gameSeconds:
        state.currentGame
          .gameSeconds

    });

}


/* =========================================================
   PASS
========================================================= */

let pendingPasserId =
  null;


function createPassRecord(
  player
) {

  if (
    pendingPasserId &&
    pendingPasserId !== player.id
  ) {

    const passer =
      getPlayerById(
        pendingPasserId
      );


    if (
      passer &&
      passer.team === player.team
    ) {

      state.currentGame
        .passes
        .push({

          id:
            uid("pass"),

          from:
            passer.id,

          to:
            player.id,

          team:
            player.team,

          gameSeconds:
            state.currentGame
              .gameSeconds

        });

    }

  }


  pendingPasserId =
    player.id;

}


/* =========================================================
   POSSESSION
========================================================= */

function changePossession() {

  if (!state.currentGame) {
    return;
  }


  pushHistory();


  state.possession =
    state.possession ===
    "home"
      ? "away"
      : "home";


  state.currentGame
    .shotSeconds =
    state.settings
      .shotClockSeconds;


  state.currentGame
    .possessions[
      state.possession
    ] += 1;


  state.currentGame
    .possessionLog
    .push({

      id:
        uid("possession"),

      team:
        state.possession,

      gameSeconds:
        state.currentGame
          .gameSeconds,

      type:
        "change"

    });


  renderAll();

}


function endPossession(
  team,
  result
) {

  const game =
    state.currentGame;


  game.possessions[
    team
  ] += 1;


  game.possessionLog.push({

    id:
      uid("possession"),

    team,

    result,

    gameSeconds:
      game.gameSeconds

  });


  state.possession =
    team === "home"
      ? "away"
      : "home";


  game.shotSeconds =
    state.settings
      .shotClockSeconds;

}


/* =========================================================
   PLUS MINUS
========================================================= */

function updatePlusMinus() {

  const game =
    state.currentGame;

  if (!game) return;


  const diff =
    game.home.score -
    game.away.score;


  game.home.players
    .filter(
      player =>
        player.active
    )
    .forEach(
      player => {

        player.stats.plusMinus =
          diff;

      }
    );


  game.away.players
    .filter(
      player =>
        player.active
    )
    .forEach(
      player => {

        player.stats.plusMinus =
          -diff;

      }
    );

}


/* =========================================================
   CLOCK ENGINE
========================================================= */

let clockTimer =
  null;


function startClock() {

  const game =
    state.currentGame;

  if (!game) {

    showToast(
      "경기를 먼저 생성해주세요."
    );

    return;

  }


  if (
    game.clockRunning
  ) {
    return;
  }


  game.clockRunning =
    true;


  clearInterval(
    clockTimer
  );


  clockTimer =
    setInterval(() => {

      if (
        !state.currentGame
      ) {
        return;
      }


      const current =
        state.currentGame;


      if (
        !current.clockRunning
      ) {
        return;
      }


      if (
        current.gameSeconds >
        0
      ) {

        current.gameSeconds -= 1;

      }


      if (
        current.shotSeconds >
        0
      ) {

        current.shotSeconds -= 1;

      }


      if (
        current.shotSeconds <=
        0
      ) {

        current.shotSeconds =
          0;

        current.clockRunning =
          false;

        clearInterval(
          clockTimer
        );

        showToast(
          "샷클락 종료"
        );

      }


      if (
        current.gameSeconds <=
        0
      ) {

        current.gameSeconds =
          0;

        current.clockRunning =
          false;

        clearInterval(
          clockTimer
        );

        showToast(
          "경기 시간이 종료되었습니다."
        );

      }


      addPlayingTime();

      renderClock();

      saveState();

    }, 1000);

}


function pauseClock() {

  if (
    !state.currentGame
  ) {
    return;
  }


  state.currentGame
    .clockRunning =
    false;


  clearInterval(
    clockTimer
  );


  saveState();

  renderClock();

}


function resetShotClock() {

  if (
    !state.currentGame
  ) {
    return;
  }


  state.currentGame
    .shotSeconds =
    state.settings
      .shotClockSeconds;


  renderClock();

  saveState();

}


function addPlayingTime() {

  const game =
    state.currentGame;

  if (!game) return;


  getAllPlayers()
    .filter(
      player =>
        player.active
    )
    .forEach(
      player => {

        player.secondsPlayed += 1;

      }
    );

}


/* =========================================================
   LIVE METRICS
========================================================= */

function calculateTeamStats(
  teamKey
) {

  const game =
    state.currentGame;

  if (!game) {
    return null;
  }


  const team =
    game[teamKey];


  const result = {

    pts:
      team.score,

    onePM:
      0,

    onePA:
      0,

    twoPM:
      0,

    twoPA:
      0,

    ast:
      0,

    oreb:
      0,

    dreb:
      0,

    stl:
      0,

    blk:
      0,

    tov:
      0,

    foul:
      0,

    passes:
      0

  };


  team.players.forEach(
    player => {

      const s =
        player.stats;


      result.onePM +=
        s.onePM;

      result.onePA +=
        s.onePA;

      result.twoPM +=
        s.twoPM;

      result.twoPA +=
        s.twoPA;

      result.ast +=
        s.ast;

      result.oreb +=
        s.oreb;

      result.dreb +=
        s.dreb;

      result.stl +=
        s.stl;

      result.blk +=
        s.blk;

      result.tov +=
        s.tov;

      result.foul +=
        s.foul;

      result.passes +=
        s.passes;

    }
  );


  result.fgm =
    result.onePM +
    result.twoPM;


  result.fga =
    result.onePA +
    result.twoPA;


  result.fgPct =
    percent(
      result.fgm,
      result.fga
    );


  result.onePct =
    percent(
      result.onePM,
      result.onePA
    );


  result.twoPct =
    percent(
      result.twoPM,
      result.twoPA
    );


  const possessions =
    game.possessions[
      teamKey
    ];


  result.possessions =
    possessions;


  result.ppp =
    possessions
      ? result.pts /
        possessions
      : 0;


  result.astTov =
    result.tov
      ? result.ast /
        result.tov
      : result.ast;


  return result;

}


/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {

  renderNavigation();

  renderDashboard();

  renderLive();

  renderGameCenter();

  renderShotLab();

  renderPassLab();

  renderPossessionLab();

  renderPlayerLab();

  renderLineupLab();

  renderGameFlow();

  renderScouting();

  renderTactics();

  renderInsights();

  renderTraining();

  renderLeague();

  renderReports();

  renderDataCenter();

  renderSettings();

  saveState();

}


/* =========================================================
   NAVIGATION RENDER
========================================================= */

function renderNavigation() {

  openPageWithoutRender(
    state.currentPage ||
    "dashboard"
  );

}


function openPageWithoutRender(
  page
) {

  $$(".page")
    .forEach(element => {

      element.classList.toggle(
        "active",
        element.id === page
      );

    });


  $$(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page ===
        page
      );

    });


  if ($("#pageTitle")) {

    $("#pageTitle")
      .textContent =
      PAGE_NAMES[page] ||
      "SEOLCHEON 3X3";

  }

}


function renderPage(page) {

  switch (page) {

    case "dashboard":
      renderDashboard();
      break;

    case "live":
      renderLive();
      break;

    case "games":
      renderGameCenter();
      break;

    case "shot":
      renderShotLab();
      break;

    case "pass":
      renderPassLab();
      break;

    case "possession":
      renderPossessionLab();
      break;

    case "players":
      renderPlayerLab();
      break;

    case "lineups":
      renderLineupLab();
      break;

    case "gameflow":
      renderGameFlow();
      break;

    case "insights":
      renderInsights();
      break;

    case "training":
      renderTraining();
      break;

    case "reports":
      renderReports();
      break;

  }

}


/* =========================================================
   DASHBOARD
========================================================= */

let performanceChart =
  null;


function renderDashboard() {

  const games =
    state.games || [];


  $("#dashboardGames")
    .textContent =
    games.length;


  if (
    games.length === 0
  ) {

    $("#dashboardWinRate")
      .textContent =
      "--";

    $("#dashboardOffRating")
      .textContent =
      "--";

    $("#dashboardPPP")
      .textContent =
      "--";

    $("#dashboard2P")
      .textContent =
      "--";

    $("#dashboardTOV")
      .textContent =
      "--";

  }


  renderPerformanceChart();

  renderRecentGames();

  renderDashboardInsights();

}


function renderPerformanceChart() {

  const canvas =
    $("#performanceChart");

  if (
    !canvas ||
    typeof Chart ===
    "undefined"
  ) {
    return;
  }


  if (
    performanceChart
  ) {

    performanceChart.destroy();

  }


  const recent =
    state.games
      .slice(-8);


  performanceChart =
    new Chart(
      canvas,
      {

        type:
          "line",

        data: {

          labels:
            recent.map(
              (_, index) =>
                `G${index + 1}`
            ),

          datasets: [

            {

              label:
                "득점",

              data:
                recent.map(
                  game =>
                    game.home
                      ?.score ||
                    0
                ),

              borderColor:
                "#e83845",

              backgroundColor:
                "rgba(232,56,69,.12)",

              borderWidth:
                2,

              tension:
                0.35,

              fill:
                true,

              pointRadius:
                3

            }

          ]

        },

        options: {

          responsive:
            true,

          maintainAspectRatio:
            false,

          plugins: {

            legend: {
              display: false
            }

          },

          scales: {

            x: {

              grid: {
                color:
                  "rgba(255,255,255,.04)"
              },

              ticks: {
                color:
                  "#687486"
              }

            },

            y: {

              beginAtZero:
                true,

              grid: {
                color:
                  "rgba(255,255,255,.04)"
              },

              ticks: {
                color:
                  "#687486"
              }

            }

          }

        }

      }
    );

}


/* =========================================================
   LIVE RENDER
========================================================= */

function renderLive() {

  const game =
    state.currentGame;


  if (!game) {

    if (
      $("#livePlayers")
    ) {

      $("#livePlayers")
        .innerHTML =
        `
          <div class="empty-state">
            새 경기를 생성해주세요.
          </div>
        `;

    }

    return;

  }


  $("#homeTeamName")
    .textContent =
    game.home.name;


  $("#awayTeamName")
    .textContent =
    game.away.name;


  $("#homeScore")
    .textContent =
    game.home.score;


  $("#awayScore")
    .textContent =
    game.away.score;


  $("#homeFouls")
    .textContent =
    `FOUL ${game.home.fouls}`;


  $("#awayFouls")
    .textContent =
    `FOUL ${game.away.fouls}`;


  renderClock();

  renderLivePlayers();

  renderSelectedPlayer();

  renderLiveStats();

  renderPlayByPlay();

}


function renderClock() {

  const game =
    state.currentGame;

  if (!game) return;


  if ($("#gameClock")) {

    $("#gameClock")
      .textContent =
      formatClock(
        game.gameSeconds
      );

  }


  if ($("#shotClock")) {

    $("#shotClock")
      .textContent =
      game.shotSeconds;

  }

}


/* =========================================================
   PLAYER LIST
========================================================= */

function renderLivePlayers() {

  const root =
    $("#livePlayers");

  if (!root) return;


  const game =
    state.currentGame;


  root.innerHTML =
    [

      ...game.home.players,

      ...game.away.players

    ]

      .map(player => {

        const selected =
          player.id ===
          state.selectedPlayerId;


        return `

          <button
            class="
              player-card
              ${selected
                ? "active"
                : ""}
            "
            data-player-id="${player.id}"
          >

            <strong>
              #${player.number}
              ${escapeHTML(
                player.name
              )}
            </strong>

            <small>
              ${player.team ===
                "home"
                ? game.home.name
                : game.away.name}
              ·
              ${player.stats.pts} PTS
            </small>

          </button>

        `;

      })

      .join("");

}


/* =========================================================
   SELECTED PLAYER
========================================================= */

function renderSelectedPlayer() {

  const label =
    $("#selectedPlayerLabel");

  if (!label) return;


  const player =
    getSelectedPlayer();


  if (!player) {

    label.textContent =
      "선수 선택";

    return;

  }


  label.textContent =
    `#${player.number} ${player.name}`;

}


/* =========================================================
   LIVE STATS
========================================================= */

function renderLiveStats() {

  const game =
    state.currentGame;

  if (!game) return;


  const stats =
    calculateTeamStats(
      "home"
    );


  $("#livePossessions")
    .textContent =
    stats.possessions;


  $("#livePPP")
    .textContent =
    stats.ppp.toFixed(2);


  $("#liveFG")
    .textContent =
    formatPercent(
      stats.fgPct
    );


  $("#liveAstTov")
    .textContent =
    stats.astTov
      .toFixed(2);


  $("#livePlusMinus")
    .textContent =
    game.home.score -
    game.away.score;

}


/* =========================================================
   PLAY BY PLAY
========================================================= */

function renderPlayByPlay() {

  const root =
    $("#playByPlay");

  if (!root) return;


  const events =
    state.currentGame
      ?.events ||
    [];


  if (
    events.length === 0
  ) {

    root.innerHTML =
      `
        <div class="empty-state">
          아직 기록이 없습니다.
        </div>
      `;

    return;

  }


  root.innerHTML =
    events

      .map(event => {

        return `

          <div class="play-row">

            <span class="play-time">
              ${formatClock(
                event.gameSeconds
              )}
            </span>

            <span class="play-player">
              #${event.playerNumber}
              ${escapeHTML(
                event.playerName
              )}
            </span>

            <span class="play-event">
              ${escapeHTML(
                event.description
              )}
            </span>

          </div>

        `;

      })

      .join("");

}


/* =========================================================
   GAME CENTER
========================================================= */

function renderGameCenter() {

  const root =
    $("#gameCenterContent");

  if (!root) return;


  if (
    state.games.length === 0
  ) {

    root.innerHTML =
      `
        <div class="panel">
          <div class="empty-state">
            저장된 경기가 없습니다.
          </div>
        </div>
      `;

    return;

  }


  root.innerHTML =
    `
      <div class="panel">

        <table class="data-table">

          <thead>

            <tr>

              <th>날짜</th>
              <th>경기</th>
              <th>스코어</th>
              <th>결과</th>

            </tr>

          </thead>

          <tbody>

            ${
              state.games
                .slice()
                .reverse()
                .map(game => {

                  const win =
                    game.home.score >
                    game.away.score;

                  return `

                    <tr>

                      <td>
                        ${game.date}
                      </td>

                      <td>
                        ${escapeHTML(
                          game.home.name
                        )}
                        vs
                        ${escapeHTML(
                          game.away.name
                        )}
                      </td>

                      <td>
                        ${game.home.score}
                        :
                        ${game.away.score}
                      </td>

                      <td>
                        ${win
                          ? "W"
                          : "L"}
                      </td>

                    </tr>

                  `;

                })
                .join("")
            }

          </tbody>

        </table>

      </div>
    `;

}


/* =========================================================
   SHOT LAB
========================================================= */

function renderShotLab() {

  const root =
    $("#shotLab");

  if (!root) return;


  const shots =
    state.currentGame
      ?.shots ||
    [];


  const made =
    shots.filter(
      shot =>
        shot.made
    ).length;


  root.innerHTML =
    `

      <div class="dashboard-grid">

        <article class="panel">

          <div class="panel-header">

            <div>

              <span class="panel-label">
                SHOT MAP
              </span>

              <h3>
                슛 위치 분석
              </h3>

            </div>

          </div>

          <div class="empty-state">

            슛 기록 ${shots.length}개
            ·
            성공 ${made}개

            <br><br>

            다음 단계에서
            실제 터치 코트와
            히트맵이 연결됩니다.

          </div>

        </article>


        <article class="panel">

          <div class="panel-header">

            <h3>
              Shot Summary
            </h3>

          </div>

          <div class="live-stat-list">

            <div>

              <span>
                Attempts
              </span>

              <strong>
                ${shots.length}
              </strong>

            </div>

            <div>

              <span>
                Made
              </span>

              <strong>
                ${made}
              </strong>

            </div>

            <div>

              <span>
                FG%
              </span>

              <strong>

                ${
                  formatPercent(
                    percent(
                      made,
                      shots.length
                    )
                  )
                }

              </strong>

            </div>

          </div>

        </article>

      </div>

    `;

}


/* =========================================================
   PASS LAB
========================================================= */

function renderPassLab() {

  const root =
    $("#passNetwork");

  if (!root) return;


  const passes =
    state.currentGame
      ?.passes ||
    [];


  root.innerHTML =
    `

      <div class="panel">

        <div class="panel-header">

          <div>

            <span class="panel-label">
              PASS NETWORK
            </span>

            <h3>
              패스 연결 분석
            </h3>

          </div>

        </div>

        <div class="empty-state">

          기록된 연결 패스:
          ${passes.length}

          <br><br>

          다음 모듈에서
          선수 노드 · 화살표 ·
          패스 굵기 · Assist Chain을
          실제 그래프로 표시합니다.

        </div>

      </div>

    `;

}


/* =========================================================
   POSSESSION LAB
========================================================= */

function renderPossessionLab() {

  const root =
    $("#possessionAnalysis");

  if (!root) return;


  if (!state.currentGame) {

    root.innerHTML =
      `<div class="empty-state">경기 데이터가 없습니다.</div>`;

    return;

  }


  const home =
    calculateTeamStats(
      "home"
    );

  const away =
    calculateTeamStats(
      "away"
    );


  root.innerHTML =
    `

      <div class="dashboard-grid">

        ${teamMetricCard(
          state.currentGame.home.name,
          home
        )}

        ${teamMetricCard(
          state.currentGame.away.name,
          away
        )}

      </div>

    `;

}


function teamMetricCard(
  name,
  stats
) {

  return `

    <article class="panel">

      <div class="panel-header">

        <h3>
          ${escapeHTML(name)}
        </h3>

      </div>

      <div class="live-stat-list">

        <div>

          <span>
            Possessions
          </span>

          <strong>
            ${stats.possessions}
          </strong>

        </div>

        <div>

          <span>
            PPP
          </span>

          <strong>
            ${stats.ppp.toFixed(2)}
          </strong>

        </div>

        <div>

          <span>
            Turnovers
          </span>

          <strong>
            ${stats.tov}
          </strong>

        </div>

        <div>

          <span>
            OREB
          </span>

          <strong>
            ${stats.oreb}
          </strong>

        </div>

      </div>

    </article>

  `;

}


/* =========================================================
   PLAYER LAB
========================================================= */

function renderPlayerLab() {

  const root =
    $("#playerAnalysis");

  if (!root) return;


  const players =
    getAllPlayers();


  if (
    players.length === 0
  ) {

    root.innerHTML =
      `<div class="empty-state">선수 데이터가 없습니다.</div>`;

    return;

  }


  root.innerHTML =
    `

      <div class="panel">

        <table class="data-table">

          <thead>

            <tr>

              <th>선수</th>
              <th>PTS</th>
              <th>1P</th>
              <th>2P</th>
              <th>REB</th>
              <th>AST</th>
              <th>STL</th>
              <th>BLK</th>
              <th>TOV</th>
              <th>+/-</th>

            </tr>

          </thead>

          <tbody>

            ${
              players
                .map(player => {

                  const s =
                    player.stats;

                  return `

                    <tr>

                      <td>
                        #${player.number}
                        ${escapeHTML(
                          player.name
                        )}
                      </td>

                      <td>
                        ${s.pts}
                      </td>

                      <td>
                        ${s.onePM}/${s.onePA}
                      </td>

                      <td>
                        ${s.twoPM}/${s.twoPA}
                      </td>

                      <td>
                        ${s.oreb + s.dreb}
                      </td>

                      <td>
                        ${s.ast}
                      </td>

                      <td>
                        ${s.stl}
                      </td>

                      <td>
                        ${s.blk}
                      </td>

                      <td>
                        ${s.tov}
                      </td>

                      <td>
                        ${s.plusMinus}
                      </td>

                    </tr>

                  `;

                })
                .join("")
            }

          </tbody>

        </table>

      </div>

    `;

}


/* =========================================================
   LINEUP
========================================================= */

function renderLineupLab() {

  const root =
    $("#lineupAnalysis");

  if (!root) return;


  root.innerHTML =
    `

      <div class="panel">

        <div class="empty-state">

          라인업 엔진 준비 완료

          <br><br>

          다음 단계에서
          교체 시스템과 연결하여

          MIN · +/- · PPP ·
          OFF RTG · DEF RTG ·
          REB% · TOV%

          를 3인 조합별로
          자동 계산합니다.

        </div>

      </div>

    `;

}


/* =========================================================
   GAME FLOW
========================================================= */

function renderGameFlow() {

  const root =
    $("#gameFlowAnalysis");

  if (!root) return;


  const events =
    state.currentGame
      ?.events ||
    [];


  root.innerHTML =
    `

      <div class="panel">

        <div class="panel-header">

          <h3>
            Game Timeline
          </h3>

        </div>

        <div class="empty-state">

          기록된 이벤트:
          ${events.length}

          <br><br>

          득점 흐름 · Run ·
          Lead Change · Momentum ·
          Clutch 그래프가
          여기에 연결됩니다.

        </div>

      </div>

    `;

}


/* =========================================================
   PLACEHOLDER MODULES
========================================================= */

function renderScouting() {}

function renderTactics() {}

function renderLeague() {}


/* =========================================================
   INSIGHTS
========================================================= */

function buildInsights() {

  const game =
    state.currentGame;

  if (!game) {
    return [];
  }


  const home =
    calculateTeamStats(
      "home"
    );


  const insights = [];


  if (
    home.twoPA >= 3 &&
    home.twoPct < 30
  ) {

    insights.push({

      title:
        "2점 공격 효율 확인",

      text:
        `현재 2점 성공률은 ${formatPercent(home.twoPct)}입니다.`

    });

  }


  if (
    home.tov >= 3
  ) {

    insights.push({

      title:
        "턴오버 관리",

      text:
        `현재 턴오버가 ${home.tov}개 기록되었습니다.`

    });

  }


  if (
    home.ast >
    home.tov * 2 &&
    home.ast >= 3
  ) {

    insights.push({

      title:
        "볼 순환",

      text:
        "어시스트 대비 턴오버 비율이 현재 높게 기록되고 있습니다."

    });

  }


  return insights;

}


function renderInsights() {

  const root =
    $("#insightsContent");

  if (!root) return;


  const insights =
    buildInsights();


  root.innerHTML =
    insights.length

      ? insights
          .map(item => `

            <article class="insight-card">

              <strong>
                ${escapeHTML(
                  item.title
                )}
              </strong>

              <p>
                ${escapeHTML(
                  item.text
                )}
              </p>

            </article>

          `)
          .join("")

      : `
        <div class="empty-state">
          분석할 데이터가 아직 부족합니다.
        </div>
      `;

}


function renderDashboardInsights() {

  const root =
    $("#dashboardInsights");

  if (!root) return;


  const insights =
    buildInsights();


  root.innerHTML =
    insights.length

      ? insights
          .slice(0, 3)
          .map(item => `

            <div class="insight-card">

              <strong>
                ${escapeHTML(
                  item.title
                )}
              </strong>

              <p>
                ${escapeHTML(
                  item.text
                )}
              </p>

            </div>

          `)
          .join("")

      : `
        <div class="empty-state">
          경기 데이터가 쌓이면
          자동 분석이 표시됩니다.
        </div>
      `;

}


/* =========================================================
   TRAINING RECOMMENDATION
========================================================= */

function buildTrainingRecommendations() {

  if (
    !state.currentGame
  ) {
    return [];
  }


  const stats =
    calculateTeamStats(
      "home"
    );


  const list = [];


  if (
    stats.twoPA >= 3 &&
    stats.twoPct < 35
  ) {

    list.push({

      category:
        "SHOOTING",

      title:
        "2점 슈팅 정확도",

      reason:
        `현재 2점 성공률 ${formatPercent(stats.twoPct)}`,

      training:
        "경기 속도에서 캐치앤슛과 패스 후 빠른 슈팅 정확도를 점검",

      target:
        "다음 경기 2P% 변화 확인"

    });

  }


  if (
    stats.tov >= 3
  ) {

    list.push({

      category:
        "DECISION",

      title:
        "압박 상황 의사결정",

      reason:
        `턴오버 ${stats.tov}개 기록`,

      training:
        "3대3 제한 공간에서 패스 선택과 볼 보호 중심 기술 훈련",

      target:
        "다음 경기 TOV 감소 확인"

    });

  }


  if (
    stats.ast < 2 &&
    stats.passes > 5
  ) {

    list.push({

      category:
        "PASSING",

      title:
        "득점으로 연결되는 패스",

      reason:
        "패스 대비 어시스트 연결 빈도가 낮음",

      training:
        "드라이브 이후 킥아웃과 컷 타이밍을 중심으로 3인 연계 훈련",

      target:
        "AST 및 패스→슛 연결률 확인"

    });

  }


  return list;

}


function renderTraining() {

  const root =
    $("#trainingRecommendations");

  if (!root) return;


  const list =
    buildTrainingRecommendations();


  root.innerHTML =
    list.length

      ? list
          .map(item => `

            <article class="panel">

              <span class="panel-label">
                ${item.category}
              </span>

              <h3>
                ${escapeHTML(
                  item.title
                )}
              </h3>

              <p>
                <strong>추천 이유</strong><br>
                ${escapeHTML(
                  item.reason
                )}
              </p>

              <p>
                <strong>추천 훈련</strong><br>
                ${escapeHTML(
                  item.training
                )}
              </p>

              <p>
                <strong>다음 확인 지표</strong><br>
                ${escapeHTML(
                  item.target
                )}
              </p>

            </article>

          `)
          .join("")

      : `
        <div class="empty-state">
          추천 훈련을 만들기 위한
          경기 데이터가 아직 부족합니다.
        </div>
      `;

}


/* =========================================================
   REPORTS
========================================================= */

let radarChart =
  null;

let reportFlowChart =
  null;

let possessionChart =
  null;


function renderReports() {

  renderRadar();

  renderReportGameFlow();

  renderPossessionChart();

  renderReportTraining();

}


function renderRadar() {

  const canvas =
    $("#performanceRadar");

  if (
    !canvas ||
    typeof Chart ===
    "undefined"
  ) {
    return;
  }


  if (radarChart) {

    radarChart.destroy();

  }


  let values =
    [0, 0, 0, 0, 0, 0];


  if (
    state.currentGame
  ) {

    const s =
      calculateTeamStats(
        "home"
      );


    values = [

      Math.min(
        100,
        s.pts * 5
      ),

      Math.min(
        100,
        s.fgPct
      ),

      Math.min(
        100,
        s.ast * 15
      ),

      Math.min(
        100,
        (s.oreb + s.dreb) *
        10
      ),

      Math.min(
        100,
        (s.stl + s.blk) *
        18
      ),

      Math.max(
        0,
        100 -
        s.tov * 15
      )

    ];

  }


  radarChart =
    new Chart(
      canvas,
      {

        type:
          "radar",

        data: {

          labels: [

            "득점력",

            "슈팅",

            "플레이메이킹",

            "리바운드",

            "수비",

            "볼 관리"

          ],

          datasets: [

            {

              label:
                "Performance",

              data:
                values,

              borderColor:
                "#e83845",

              backgroundColor:
                "rgba(232,56,69,.15)",

              borderWidth:
                2,

              pointBackgroundColor:
                "#e83845"

            }

          ]

        },

        options: {

          responsive:
            true,

          maintainAspectRatio:
            false,

          scales: {

            r: {

              min:
                0,

              max:
                100,

              ticks: {
                display: false
              },

              grid: {

                color:
                  "rgba(255,255,255,.08)"

              },

              angleLines: {

                color:
                  "rgba(255,255,255,.08)"

              },

              pointLabels: {

                color:
                  "#9aa5b4",

                font: {
                  size: 10
                }

              }

            }

          },

          plugins: {

            legend: {
              display: false
            }

          }

        }

      }
    );

}


function renderReportGameFlow() {

  const canvas =
    $("#reportGameFlow");

  if (
    !canvas ||
    typeof Chart ===
    "undefined"
  ) {
    return;
  }


  if (
    reportFlowChart
  ) {

    reportFlowChart.destroy();

  }


  const events =
    state.currentGame
      ?.events
      ?.slice()
      .reverse() ||
    [];


  reportFlowChart =
    new Chart(
      canvas,
      {

        type:
          "line",

        data: {

          labels:
            events.map(
              event =>
                formatClock(
                  event.gameSeconds
                )
            ),

          datasets: [

            {

              label:
                "설천고",

              data:
                events.map(
                  event =>
                    event.scoreHome
                ),

              borderColor:
                "#e83845",

              tension:
                0.3

            },

            {

              label:
                "상대팀",

              data:
                events.map(
                  event =>
                    event.scoreAway
                ),

              borderColor:
                "#2589ff",

              tension:
                0.3

            }

          ]

        },

        options: {

          responsive:
            true,

          maintainAspectRatio:
            false,

          scales: {

            x: {

              ticks: {
                color:
                  "#687486"
              },

              grid: {
                color:
                  "rgba(255,255,255,.04)"
              }

            },

            y: {

              beginAtZero:
                true,

              ticks: {
                color:
                  "#687486"
              },

              grid: {
                color:
                  "rgba(255,255,255,.04)"
              }

            }

          }

        }

      }
    );

}


function renderPossessionChart() {

  const canvas =
    $("#possessionChart");

  if (
    !canvas ||
    typeof Chart ===
    "undefined"
  ) {
    return;
  }


  if (
    possessionChart
  ) {

    possessionChart.destroy();

  }


  const log =
    state.currentGame
      ?.possessionLog ||
    [];


  const turnover =
    log.filter(
      item =>
        item.result ===
        "turnover"
    ).length;


  const others =
    Math.max(
      0,
      log.length -
      turnover
    );


  possessionChart =
    new Chart(
      canvas,
      {

        type:
          "doughnut",

        data: {

          labels: [
            "Turnover",
            "Other"
          ],

          datasets: [

            {

              data: [
                turnover,
                others
              ],

              backgroundColor: [
                "#e83845",
                "#2589ff"
              ],

              borderWidth:
                0

            }

          ]

        },

        options: {

          responsive:
            true,

          plugins: {

            legend: {

              labels: {
                color:
                  "#9aa5b4"
              }

            }

          }

        }

      }
    );

}


function renderReportTraining() {

  const root =
    $("#reportTraining");

  if (!root) return;


  const list =
    buildTrainingRecommendations();


  root.innerHTML =
    list.length

      ? list
          .map(item => `

            <div class="insight-card">

              <strong>
                ${escapeHTML(
                  item.title
                )}
              </strong>

              <p>
                ${escapeHTML(
                  item.reason
                )}
              </p>

              <p>
                ${escapeHTML(
                  item.training
                )}
              </p>

            </div>

          `)
          .join("")

      : `
        <div class="empty-state">
          추천 훈련 데이터 없음
        </div>
      `;

}


/* =========================================================
   RECENT GAMES
========================================================= */

function renderRecentGames() {

  const root =
    $("#recentGames");

  if (!root) return;


  const games =
    state.games
      .slice(-4)
      .reverse();


  root.innerHTML =
    games.length

      ? games
          .map(game => `

            <div class="insight-card">

              <strong>
                ${escapeHTML(
                  game.home.name
                )}
                ${game.home.score}
                :
                ${game.away.score}
                ${escapeHTML(
                  game.away.name
                )}
              </strong>

              <p>
                ${game.date}
              </p>

            </div>

          `)
          .join("")

      : `
        <div class="empty-state">
          저장된 경기가 없습니다.
        </div>
      `;

}


/* =========================================================
   DATA CENTER
========================================================= */

function renderDataCenter() {

  const root =
    $("#dataCenter");

  if (!root) return;


  root.innerHTML =
    `

      <div class="dashboard-grid">

        <article class="panel">

          <div class="panel-header">
            <h3>백업</h3>
          </div>

          <button
            class="primary-button"
            id="exportDataButton"
          >
            JSON 백업
          </button>

        </article>


        <article class="panel">

          <div class="panel-header">
            <h3>현재 저장 데이터</h3>
          </div>

          <div class="live-stat-list">

            <div>
              <span>경기</span>
              <strong>
                ${state.games.length}
              </strong>
            </div>

            <div>
              <span>Undo 기록</span>
              <strong>
                ${state.history.length}
              </strong>
            </div>

          </div>

        </article>

      </div>

    `;

}


/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {

  const root =
    $("#settingsContent");

  if (!root) return;


  root.innerHTML =
    `

      <div class="panel">

        <div class="form-grid">

          <label>

            경기 시간(초)

            <input
              id="settingGameSeconds"
              type="number"
              value="${
                state.settings
                  .gameSeconds
              }"
            >

          </label>


          <label>

            샷클락

            <input
              id="settingShotClock"
              type="number"
              value="${
                state.settings
                  .shotClockSeconds
              }"
            >

          </label>

        </div>

      </div>

    `;

}


/* =========================================================
   EXPORT
========================================================= */

function exportData() {

  const blob =
    new Blob(
      [
        JSON.stringify(
          state,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const anchor =
    document.createElement(
      "a"
    );


  anchor.href =
    url;

  anchor.download =
    `seolcheon-3x3-backup-${Date.now()}.json`;


  anchor.click();


  URL.revokeObjectURL(
    url
  );


  showToast(
    "백업 파일을 생성했습니다."
  );

}


/* =========================================================
   SAVE CURRENT GAME
========================================================= */

function saveCurrentGame() {

  if (
    !state.currentGame
  ) {
    return;
  }


  const game =
    clone(
      state.currentGame
    );


  game.status =
    "finished";


  const existing =
    state.games.findIndex(
      item =>
        item.id ===
        game.id
    );


  if (
    existing >= 0
  ) {

    state.games[
      existing
    ] =
      game;

  }

  else {

    state.games.push(
      game
    );

  }


  saveState();

  renderAll();

  showToast(
    "경기가 저장되었습니다."
  );

}


/* =========================================================
   EVENTS
========================================================= */

document.addEventListener(
  "click",
  event => {

    const nav =
      event.target.closest(
        "[data-page]"
      );


    if (nav) {

      openPage(
        nav.dataset.page
      );

      return;

    }


    const open =
      event.target.closest(
        "[data-open-page]"
      );


    if (open) {

      openPage(
        open.dataset.openPage
      );

      return;

    }


    const playerButton =
      event.target.closest(
        "[data-player-id]"
      );


    if (playerButton) {

      state.selectedPlayerId =
        playerButton
          .dataset
          .playerId;

      renderLive();

      saveState();

      return;

    }


    const eventButton =
      event.target.closest(
        "[data-event]"
      );


    if (eventButton) {

      recordEvent(
        eventButton
          .dataset
          .event
      );

      return;

    }


    if (
      event.target.closest(
        "#newGameButton"
      )
    ) {

      openNewGameModal();

      return;

    }


    if (
      event.target.closest(
        "#closeNewGame"
      ) ||
      event.target.closest(
        "#cancelNewGame"
      )
    ) {

      closeNewGameModal();

      return;

    }


    if (
      event.target.closest(
        "#createGame"
      )
    ) {

      createGameFromModal();

      return;

    }


    if (
      event.target.closest(
        "#undoButton"
      )
    ) {

      undo();

      return;

    }


    if (
      event.target.closest(
        "#redoButton"
      )
    ) {

      redo();

      return;

    }


    if (
      event.target.closest(
        "#startClock"
      )
    ) {

      startClock();

      return;

    }


    if (
      event.target.closest(
        "#pauseClock"
      )
    ) {

      pauseClock();

      return;

    }


    if (
      event.target.closest(
        "#resetShotClock"
      )
    ) {

      resetShotClock();

      return;

    }


    if (
      event.target.closest(
        "#possessionButton"
      )
    ) {

      changePossession();

      return;

    }


    if (
      event.target.closest(
        "#printReport"
      )
    ) {

      window.print();

      return;

    }


    if (
      event.target.closest(
        "#exportDataButton"
      )
    ) {

      exportData();

      return;

    }

  }
);


/* =========================================================
   KEYBOARD SHORTCUT
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    const modifier =
      event.ctrlKey ||
      event.metaKey;


    if (
      modifier &&
      event.key.toLowerCase() ===
      "z"
    ) {

      event.preventDefault();

      if (event.shiftKey) {
        redo();
      }

      else {
        undo();
      }

    }

  }
);


/* =========================================================
   BEFORE LEAVE
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    saveState();

  }
);


/* =========================================================
   INITIALIZE
========================================================= */

function initialize() {

  createRosterInputs();

  renderAll();


  if (
    state.currentGame
      ?.clockRunning
  ) {

    state.currentGame
      .clockRunning =
      false;

    saveState();

  }

}


initialize();