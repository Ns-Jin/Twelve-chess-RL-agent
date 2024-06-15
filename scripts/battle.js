import { Environment } from "./environment.js";
import { DQNAgent } from "./DQNAgent.js";

function loadAgentParams(name) {
    return new Promise((resolve, reject) => {
        const dbRequest = indexedDB.open('DQNAgentDB', 1);

        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['agentParams'], 'readonly');
            const store = transaction.objectStore('agentParams');
            const getRequest = store.get(name);

            getRequest.onsuccess = function(event) {
                if (event.target.result) {
                    resolve(event.target.result.params);
                } else {
                    reject(`No data found for ${name}`);
                }
            };

            getRequest.onerror = function(event) {
                reject('Error loading parameters:', event.target.errorCode);
            };
        };

        dbRequest.onerror = function(event) {
            reject('Error opening IndexedDB:', event.target.errorCode);
        };
    });
}

function transformToIndex(x, y) {
    let i, j;

    if ((x > 0 && x < 75 && y < 150) || (x > 225 && x < 375) || (x > 675 && x < 750 && y > 450)) {
        j = 0;
    }
    else if ((x > 75 && x < 150 && y < 150) || (x > 375 && x < 525) || (x > 750 && x < 825 && y > 450)) {
        j = 1;
    }
    else if ((x > 150 && x < 225 && y < 150) || (x > 525 && x < 675) || (x > 825 && x < 900 && y > 450)) {
        j = 2;
    }

    if (y > 0 && y < 150) {
        if (x > 225) {
            i = 2;
        }
        else if (y < 75) {
            i = 0;
        }
        else {
            i = 1;
        }
    }
    else if (y > 450 && y < 600) {
        if (x < 675) {
            i = 5;
        }
        else if (y < 525) {
            i = 6;
        }
        else {
            i = 7;
        }
    }
    else if (y > 150 && y < 300) {
        i = 3;
    }
    else if (y > 300 && y < 450) {
        i = 4;
    }

    return { i, j };
}

function transformToCoordinate(i, j) {
    let centerX, centerY;

    if (j === 0) {
        centerX = 300;
    } else if (j === 1) {
        centerX = 450;
    } else if (j === 2) {
        centerX = 600;
    }

    if (i === 0) {
        centerY = 37.5;
    } else if (i === 1) {
        centerY = 112.5;
    } else if (i === 2) {
        centerY = 75;
    } else if (i === 3) {
        centerY = 225;
    } else if (i === 4) {
        centerY = 375;
    } else if (i === 5) {
        centerY = 525;
    } else if (i === 6) {
        centerY = 487.5;
    } else if (i === 7) {
        centerY = 562.5;
    }
    return { centerX, centerY };
}

function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i].length !== arr2[i].length) return false;
        for (let j = 0; j < arr1[i].length; j++) {
            if (arr1[i][j] !== arr2[i][j]) return false;
        }
    }
    return true;
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

document.addEventListener('DOMContentLoaded', async () => {
    const env = new Environment(150);
    env.render("battle_area");
    const name = 'dqn_agent';
    let loaded_params;

    const overlayCanvas = document.getElementById('overlay_area');
    const overlayCtx = overlayCanvas.getContext('2d');

    try {
        const params = await loadAgentParams(name);
        console.log('Loaded parameters:', params);
        loaded_params = structuredClone(params);

        const model_type = getQueryParam('model');
        let agent;
        if (model_type == 'custom_model') {
            agent = new DQNAgent('red', env.board_col * env.board_row, env.action_size, loaded_params.model_architecture, loaded_params.discountFactor, loaded_params.learningRate, loaded_params.batchSize, loaded_params.render);
            agent.load_model(name);
        }
        else {
            agent = new DQNAgent('red', env.board_col * env.board_row, env.action_size);
            agent.load_model_from_file('dqn_agent');
        }
        agent.epsilon = agent.epsilon_min;

        let state, next_state, turn, reward, done, action, possible_actions;
        done = false;
        let selected = [];
        ({ state, turn } = env.reset());

        const onClick = async (event) => {
            if (loaded_params.turn === turn) return;
            const { offsetX, offsetY } = event;
            let i, j;
            ({ i, j } = transformToIndex(offsetX, offsetY));
            console.log(offsetX, offsetY, i, j);
            if (i === undefined || j === undefined) {
                selected = [];
                return;
            }
            if (selected.length === 0) {
                overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                selected = [i, j];
                if (state[i][j].team === turn) {
                    possible_actions = env.find_possible_actions(state, turn, [i, j]);
                    for (let index = 0; index < possible_actions.length; index++) {
                        let possible_action = possible_actions[index];
                        let centerX, centerY;
                        ({ centerX, centerY } = transformToCoordinate(env.actions[possible_action][1][0], env.actions[possible_action][1][1]));
                        overlayCtx.beginPath();
                        overlayCtx.arc(centerX, centerY, 50, 0, Math.PI * 2);
                        overlayCtx.fillStyle = 'yellow';
                        overlayCtx.fill();
                    }
                } else {
                    selected = [];
                }
            } else if (i >= 2 && i <= 5) {
                const temp_action = [selected, [i, j]];
                for (let index = 0; index < possible_actions.length; index++) {
                    let possible_action = possible_actions[index];
                    if (arraysEqual(temp_action, env.actions[possible_action])) {
                        ({ next_state, turn, reward, done } = env.step(possible_action));
                        env.render("battle_area");
                        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                        selected = [];
                        state = next_state;
                        if (done) return;
                        break;
                    }
                }
                selected = [];
                overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            }
        };

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const agentTurn = async () => {
            await delay(500);
            if (done) return;
            env.render("battle_area");
            possible_actions = env.find_possible_actions(state, turn);
            action = agent.get_action(state, possible_actions);
            ({ next_state, turn, reward, done } = env.step(action));
            state = next_state;
            if (done) return;
            if (loaded_params.turn != turn) {
                overlayCanvas.addEventListener('click', onClick);
            }
        };

        overlayCanvas.addEventListener('click', onClick);

        while (!done) {
            if (loaded_params.turn === turn) {
                await agentTurn();
            } else {
                await delay(10);
            }
        }
        if(done) {
            document.getElementById('modal').style.display = 'block';
            const winner = turn === 'green' ? 'red' : 'green';
            document.getElementById('winner').innerText = 'Winner: ' + winner.toUpperCase();
            document.getElementById('winner').style.color = winner;
            if(winner == 'red') {
                document.querySelectorAll('button').forEach(button => {
                    button.style.backgroundColor = 'red'; // 원하는 색상으로 변경
                });
            }
        }

    } catch (error) {
        console.error(error);
    }
});

document.getElementById('restart_button').addEventListener('click', function() {
    location.reload();
});

document.getElementById('back_button').addEventListener('click', function() {
    window.location.href = '../index.html';
});

window.onclick = function(event) {
    if (event.target == document.getElementById('modal')) {
        document.getElementById('modal').style.display = 'none';
    }
};