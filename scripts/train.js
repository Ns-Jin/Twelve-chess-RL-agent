import { Environment } from "./environment.js";
import { DQNAgent } from "./DQNAgent.js";

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

    try {
        const env = new Environment(100);
        const agent = new DQNAgent('red',env.board_col * env.board_row,env.action_size,modelArchitecture,discountFactor,learningRate,batchSize,render);
        const opponent = new DQNAgent('green', env.board_col * env.board_row, env.action_size, modelArchitecture, discountFactor, learningRate, batchSize, render);

        let state, next_state, turn, reward, done, action, possible_actions, enemy_action, enemy_reward, enemy_next_state;
        let scores = [], episodes = [];
        let global_timesteps = 0, local_timesteps = 0;
        let early_stop_signal = false;

        document.getElementById('stop-btn').disabled = false;
        document.getElementById('stop-btn').addEventListener('click', async function() {
            early_stop_signal = true;
        });

        for(let e=0;e<TOTAL_EPISODES;e++) {
            if(early_stop_signal) {
                break;
            }
            done = false;
            let score = 0.0;
            
            ({ state, turn } = env.reset());

            while (!done) {
                if(agent.render) {
                    env.render("render_area");
                    await new Promise(resolve => setTimeout(resolve, renderSpeed));
                }
                possible_actions = env.find_possible_actions(state, turn);
                action = agent.get_action(state, possible_actions);
                ({next_state, turn, reward, done} = env.step(action));

                if(agent.render) {
                    env.render("render_area");
                    await new Promise(resolve => setTimeout(resolve, renderSpeed));
                }
                
                if(!done) {
                    // 상대 행동도 한턴에 같이 실행
                    possible_actions = env.find_possible_actions(next_state, turn);

                    if(e < TOTAL_EPISODES * 0.7) {
                        // 랜덤행동
                        const random_index = Math.floor(Math.random() * possible_actions.length);
                        enemy_action = possible_actions[random_index];
                        ({next_state, turn, reward: enemy_reward, done} = env.step(enemy_action));
                        reward -= enemy_reward;
                    }
                    else {
                        // dqn 기반 행동 및 학습
                        enemy_action = opponent.get_action(next_state, possible_actions);
                        ({ next_state: enemy_next_state, turn, reward: enemy_reward, done } = env.step(enemy_action));
                        reward -= enemy_reward;
                        opponent.append_sample(next_state, action, enemy_reward, enemy_next_state, done);
                    }
                }

                agent.append_sample(state, action, reward, next_state, done);

                if (agent.memory.length >= agent.train_start) {
                    await agent.train_model();
                }
                if (opponent.memory.length >= opponent.train_start) {
                    await opponent.train_model();
                }

                score += reward;
                state = next_state;
                local_timesteps++;

                if (done) {
                    // await agent.save_model("dqn_agent");
                    env.reset();
                    agent.update_target_model();
                    opponent.update_target_model();
                    
                    global_timesteps += local_timesteps;
                    local_timesteps = 0;

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
                    console.log(`episode: ${e}, score: ${score}, memory length: ${agent.memory.length}, epsilon: ${agent.epsilon}, timestep: ${global_timesteps} (+${local_timesteps})`);
                }
            }
        }
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