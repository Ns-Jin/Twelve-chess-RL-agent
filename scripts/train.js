import { Environment } from "./environment.js";
import { DQNAgent } from "./DQNAgent.js";

document.getElementById('back_icon').addEventListener('click', function() {
    window.location.href = '../index.html';
});

document.getElementById('episodes').addEventListener('input', function() {
    const episodesValue = parseInt(this.value);
    const renderSelect = document.getElementById('render');
    
    if (episodesValue > 5000) {
        renderSelect.value = 'false';
        renderSelect.disabled = true;
    } else {
        renderSelect.disabled = false;
    }
});

document.getElementById('modelConfigForm').onsubmit = async function(event) {
    event.preventDefault(); // Prevent the form from submitting through the browser.

    const form = event.target;
    const TOTAL_EPISODES = parseInt(form.episodes.value);
    const modelArchitecture = form.modelArchitecture.value.split('-').map(Number);
    const discountFactor = parseFloat(form.discountFactor.value);
    const learningRate = parseFloat(form.learningRate.value);
    const batchSize = parseInt(form.batchSize.value);
    const render = form.render.value === 'true';
    let renderSpeed = parseInt(document.getElementById('renderSpeed').value);

    document.getElementById('renderSpeed').addEventListener('input', function() {
        renderSpeed = parseInt(this.value);
        document.getElementById('renderSpeedValue').textContent = renderSpeed + 'ms';
        console.log('Render Speed:', renderSpeed);
    });

    console.log('Episodes:', TOTAL_EPISODES);
    console.log('Model Architecture:', modelArchitecture);
    console.log('Discount Factor:', discountFactor);
    console.log('Learning Rate:', learningRate);
    console.log('Batch Size:', batchSize);
    console.log('Render:', render);

    let early_stop_signal = false;
    const stop_button = document.getElementById('stop-btn');
    stop_button.disabled = false;
    stop_button.addEventListener('click', function() {
        early_stop_signal = true;
        stop_button.disabled = true;
    }, { once: true }); 

    try {
        const env = new Environment(100);
        const agent = new DQNAgent('red',env.board_col * env.board_row,env.action_size,modelArchitecture,discountFactor,learningRate,batchSize,render);
        const opponent = new DQNAgent('green', env.board_col * env.board_row, env.action_size, modelArchitecture, discountFactor, learningRate, batchSize, render);

        let state, next_state, turn, reward, done, action, possible_actions, enemy_action, enemy_reward, enemy_next_state;
        let agent_win_count = 0;
        let scores = [], episodes = [];
        let global_timesteps = 0, local_timesteps = 0;
        const EPISODES_THRESHOLD = parseInt(TOTAL_EPISODES * 0.7);
        
        for(let e=0;e<TOTAL_EPISODES;e++) {
            if(early_stop_signal) {
                break;
            }
            done = false;
            let score = 0.0;
            
            ({ state, turn } = env.reset());
            let previous_reward = 0, previous_action, previous_state;

            while (!done) {
                if(agent.render) {
                    env.render("render_area");
                    await new Promise(resolve => setTimeout(resolve, renderSpeed));
                }

                possible_actions = env.find_possible_actions(state, turn);
                if (turn == agent.turn) {
                    action = agent.get_action(state, possible_actions);
                }
                else {
                    if(e < EPISODES_THRESHOLD) {
                        // 랜덤 행동
                        const random_index = Math.floor(Math.random() * possible_actions.length);
                        action = possible_actions[random_index];
                    }
                    else {
                        // dqn 기반 행동
                        action = opponent.get_action(state, possible_actions);
                    }
                }
                ({next_state, turn, reward, done} = env.step(action));
                

                if(previous_state !== undefined) {
                    // 이전 상태와 행동에 대해 메모리에 추가
                    const agentToUpdate = (turn === 'red' ? opponent : agent);
                    if ((turn == agent.turn) || (turn == opponent.turn && e >= EPISODES_THRESHOLD)) {
                        agent.append_sample(previous_state, previous_action, previous_reward - reward, next_state, done);
                    }
                }

                // 현재 턴의 상태, 행동, 보상을 저장
                previous_state = state;
                previous_action = action;
                previous_reward = reward;
                state = next_state;
                local_timesteps++;

                if(turn == agent.turn) {
                    score += reward;
                }
                else {
                    score -= reward;
                }

                if(agent.render) {
                    env.render("render_area");
                    await new Promise(resolve => setTimeout(resolve, renderSpeed));
                }
                if (done) {
                    // 마지막 턴의 보상 업데이트
                    (turn === agent.turn ? agent : opponent).append_sample(previous_state, previous_action, previous_reward, next_state, done);
                }
                if ((turn === agent.turn ? agent.memory : opponent.memory).length >= (turn === agent.turn ? agent.train_start : opponent.train_pos)) {
                    await (turn === agent.turn ? agent : opponent).train_model();
                }

                if (done) {
                    env.reset();
                    agent.update_target_model();
                    if(e >= EPISODES_THRESHOLD) {
                        opponent.update_target_model();
                    }
                    
                    if(score > 0) {
                        agent_win_count++;
                    }
                    global_timesteps += local_timesteps;
                    local_timesteps = 0;

                    if(agent.render) {
                        // 각 에피소드마다 타임스텝을 plot
                        scores.push(score);
                        episodes.push(e);
                        
                        const trace = {
                            x: episodes,
                            y: scores,
                            type: 'scatter',
                            mode: 'lines+markers',
                            marker: { color: 'blue' }
                        };
            
                        const layout = {
                            title: 'Score per episode',
                            xaxis: { title: 'Episode' },
                            yaxis: { title: 'Score' }
                        };
            
                        Plotly.newPlot('plot', [trace], layout);
                    }

                    if (e % 500 == 0) {
                        // 500 epi 마다 모델 저장
                        await agent.save_model("dqn_agent");
                        await opponent.save_model("opponent");
                    }

                    console.log(`episode: ${e}, score: ${score}, memory length: ${agent.memory.length}, epsilon: ${agent.epsilon}, timestep: ${global_timesteps} (+${local_timesteps})`);
                }
            }
        }
        console.log(`Total episodes: ${TOTAL_EPISODES}, Agent win episodes: ${agent_win_count}, Agent win rate: ${agent_win_count / TOTAL_EPISODES}`);
        await agent.save_model("dqn_agent");
        await opponent.save_model("opponent");
        await agent.save_model_to_file("dqn_agent");
        await opponent.save_model_to_file("opponent");
    } catch (error) {
        console.log('에러 발생:', error.message);
    } finally {
        console.log('DQN Agent 생성 완료');
    }    
};