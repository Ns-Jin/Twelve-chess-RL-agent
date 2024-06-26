import { Environment } from "./environment.js";
import { A2CAgent } from "./A2CAgent.js";

document.getElementById('back_icon').addEventListener('click', function() {
    window.location.href = '../index.html';
});

document.getElementById('undo_logo').addEventListener('click', function() {
    window.location.href = './agent_learning_dqn.html';
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
    const TEST_EPISODES = TOTAL_EPISODES/10;
    const modelArchitecture = form.modelArchitecture.value.split('-').map(Number);
    const discountFactor = parseFloat(form.discountFactor.value);
    const learningRate = parseFloat(form.learningRate.value);
    const batchSize = parseInt(form.batchSize.value);
    const render = form.render.value === 'true';
    let renderSpeed = parseInt(document.getElementById('renderSpeed').value);

    document.getElementById('renderSpeed').addEventListener('input', function() {
        renderSpeed = parseInt(this.value);
        document.getElementById('renderSpeedValue').textContent = renderSpeed + 'ms';
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
        const a2c_agent = new A2CAgent('red', env.board_col * env.board_row,env.action_size, TOTAL_EPISODES, modelArchitecture, discountFactor, learningRate, render);
        a2c_agent.load_model("a2c_agent");
        
        let state, next_state, turn, reward, done, action, possible_actions;
        let a2c_agent_win_count = 0;
        let scores = [], episodes = [];
        let global_timesteps = 0, local_timesteps = 0;
        
        for(let e=0;e<TOTAL_EPISODES;e++) {
            console.log("Memory: " + tf.memory().numTensors);
            if(early_stop_signal) {
                break;
            }
            done = false;
            let score = 0.0;
            
            ({ state, turn } = env.reset());
            let previous_reward = 0, previous_action, previous_state;

            while (!done) {
                if(a2c_agent.render) {
                    env.render("render_area");
                    await new Promise(resolve => setTimeout(resolve, renderSpeed));
                }
                possible_actions = env.find_possible_actions(state, turn);

                if (turn == a2c_agent.turn) {
                    action = a2c_agent.get_action(state, possible_actions);
                }
                else {
                    const random_index = Math.floor(Math.random() * possible_actions.length);
                    action = possible_actions[random_index];
                }

                ({next_state, turn, reward, done} = env.step(action));

                await a2c_agent.train_model(state, action, reward, next_state, done, possible_actions);

                previous_state = state;
                previous_action = action;
                previous_reward = reward;
                state = next_state;
                local_timesteps++;

                if(turn == a2c_agent.turn) {
                    score += reward;
                }
                else {
                    score -= reward;
                }

                if(a2c_agent.render) {
                    env.render("render_area");
                    await new Promise(resolve => setTimeout(resolve, renderSpeed));
                }

                if (done) {
                    env.reset();

                    if(score > 0) {
                        a2c_agent_win_count++;
                    }
                    global_timesteps += local_timesteps;

                    if(a2c_agent.render) {
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
                        await a2c_agent.save_model("a2c_agent");
                    }

                    console.log(`episode: ${e}, score: ${score}, timestep: ${global_timesteps} (+${local_timesteps})`);
                    local_timesteps = 0;
                }
            }
        }
        console.log(`Total episodes: ${TOTAL_EPISODES}, A2C Agent win episodes: ${a2c_agent_win_count}, Agent win rate: ${a2c_agent_win_count / TOTAL_EPISODES}`);
        
        a2c_agent_win_count = 0;
        scores = [];
        for(let e=0;e<TEST_EPISODES;e++) {
            done = false;
            let score = 0.0;
            
            ({ state, turn } = env.reset());

            while (!done) {
                possible_actions = env.find_possible_actions(state, turn);
                if (turn == a2c_agent.turn) {
                    action = a2c_agent.get_action(state,possible_actions);
                }
                else {
                    // 랜덤 행동
                    const random_index = Math.floor(Math.random() * possible_actions.length);
                    action = possible_actions[random_index];
                }
                ({next_state, turn, reward, done} = env.step(action));

                state = next_state;

                if(turn == a2c_agent.turn) {
                    score += reward;
                }
                else {
                    score -= reward;
                }

                if (done) {
                    
                    if(score > 0) {
                        a2c_agent_win_count++;
                    }

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
                        title: 'A2C Agent score per test episode',
                        xaxis: { title: 'Episode' },
                        yaxis: { title: 'Score' }
                    };
        
                    Plotly.newPlot('plot2', [trace], layout);
                }
            }
        }
        console.log(`Test episodes: ${TEST_EPISODES}, A2C Agent win episodes: ${a2c_agent_win_count}, A2C Agent win rate: ${a2c_agent_win_count / TEST_EPISODES}`);

        await a2c_agent.save_model("a2c_agent");
        await a2c_agent.save_model_to_file("a2c_agent");
    } catch (error) {
        console.log('에러 발생:', error.message);
    } finally {
        console.log('DQN Agent 생성 완료');
    }    
};