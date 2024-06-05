import { Environment } from "./environment.js";
import {DQNAgent, ListNode, Deque} from "./DQNAgent.js";



document.getElementById('modelConfigForm').onsubmit = function(event) {
    event.preventDefault(); // Prevent the form from submitting through the browser.

    const form = event.target;
    const episodes = parseInt(form.episodes.value);
    const modelArchitecture = form.modelArchitecture.value.split('-').map(Number);
    const discountFactor = parseFloat(form.discountFactor.value);
    const learningRate = parseFloat(form.learningRate.value);
    const batchSize = parseInt(form.batchSize.value);
    const render = form.render.value === 'true';

    console.log('Episodes:', episodes);
    console.log('Model Architecture:', modelArchitecture);
    console.log('Discount Factor:', discountFactor);
    console.log('Learning Rate:', learningRate);
    console.log('Batch Size:', batchSize);
    console.log('Render:', render);

    try {
        const env = new Environment()
        // console.log(env)
        //env에서 state, action size 반환해서 아래 1,1에 넣기
        const agent = new DQNAgent(1,1,modelArchitecture,discountFactor,learningRate,batchSize,render)
    } catch (error) {
        console.log('에러 발생:', error.message);
    } finally {
        console.log('DQN Agent 생성 완료');
    }
    
};
// let agent = new DQNAgent(1,1,[64,32],0.99,0.001,64,true)
// console.log(agent)
// let env = new Environment()
// console.log(env)