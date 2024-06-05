

export class ListNode {
    constructor(value) {
        this.value = value;
        this.prev = null;
        this.next = null;
    }
}

export class Deque {
    constructor(max_len) {
        this.max_len = max_len;
        this.length = 0;
        this.head = null;
        this.tail = null;
    }

    push(value) {
        const new_node = new ListNode(value);
        if (this.length === 0) {
            this.head = this.tail = new_node;
        } else {
            new_node.prev = this.tail;
            this.tail.next = new_node;
            this.tail = new_node;
        }
        if (this.length === this.max_len) {
            this.shift();
        } else {
            this.length++;
        }
    }

    pop() {
        if (!this.tail) return undefined;
        const value = this.tail.value;
        this.tail = this.tail.prev;
        if (this.tail) {
            this.tail.next = null;
        } else {
            this.head = null;
        }
        this.length--;
        return value;
    }

    shift() {
        if (!this.head) return undefined;
        const value = this.head.value;
        this.head = this.head.next;
        if (this.head) {
            this.head.prev = null;
        } else {
            this.tail = null;
        }
        this.length--;
        return value;
    }

    unshift(value) {
        const new_node = new ListNode(value);
        if (this.length === 0) {
            this.head = this.tail = new_node;
        } else {
            new_node.next = this.head;
            this.head.prev = new_node;
            this.head = new_node;
        }
        if (this.length === this.max_len) {
            this.pop();
        } else {
            this.length++;
        }
    }
}


export class DQNAgent {
    constructor(state_size, action_size, model_architecture, discount_factor, learning_rate, batch_size, render) {
        this.render = render;

        this.state_size = state_size;
        this.action_size = action_size;

        // DQN 하이퍼파라미터
        this.discount_factor = discount_factor  // 0.99
        this.learning_rate = learning_rate      // 0.001
        this.epsilon = 1.0
        this.epsilon_min = 0.005
        this.epsilon_decay = (this.epsilon - this.epsilon_min) / 50000
        this.batch_size = batch_size            // 64
        this.train_start = 1000                 // 학습 시작 시점

        // 리플레이 메모리, 최대 크기 설정
        this.queue_len_max = 5000
        this.memory = new Deque(this.queue_len_max)

        // 학습 모델, 타겟 모델 똑같이 생성
        this.model = this.build_model(model_architecture)
        this.target_model = this.build_model(model_architecture)

        // 타겟 모델 업데이트 (학습 모델로 덮어씌움)
        this.update_target_model()
    }

    /********************************* private *********************************/
    build_model(model_architecture) {
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: parseInt(model_architecture[0]), inputShape: [this.state_size], activation: 'relu', kernelInitializer: 'heUniform' }));
        for(let i=1;i<model_architecture.length;i++) {
            model.add(tf.layers.dense({ units: model_architecture[i], activation: 'relu', kernelIniitalizer: 'heUniform' }));
        }
        model.add(tf.layers.dense({ units: this.action_size, activation: 'linear', kernelInitializer: 'heUniform' }));
        model.compile({ loss: 'meanSquaredError', optimizer: tf.train.adam(this.learning_rate) });
        model.summary();
        return model;
    }

    update_target_model() {
        this.target_model.setWeights(this.model.getWeights());
    }

    get_action(state) {
        if (Math.random() <= this.epsilon) {
            return Math.floor(Math.random() * this.action_size);
        } else {
            return tf.tidy(() => {
                const q_values = this.model.predict(tf.tensor2d([state]));
                return q_values.argMax(1).dataSync()[0];
            });
        }
    }

    append_sample(state, action, reward, nextState, done) {
        this.memory.push({ state, action, reward, nextState, done });
        if (this.epsilon > this.epsilon_min) {
            this.epsilon -= this.epsilon_decay;
        }
    }

    async train_model() {
        if (this.memory.length < this.batch_size) return;

        const batch = tf.util.shuffle(this.memory).slice(0, this.batch_size);
        const states = batch.map(sample => sample.state);
        const next_states = batch.map(sample => sample.nextState);

        const current_q_values = this.model.predict(tf.tensor2d(states));
        const next_q_values = this.targetUrl.model.predict(tf.tensor2d(next_states));

        const targets = current_q_values.arraySync().map((currentQ, index) => {
            const {action, reward, done} = batch[index];
            currentQ[action] = done ? reward : (reward + this.discountFactor * Math.max(...next_q_values[index]));
            return currentQ;
        });

        await this.model.fit(tf.tensor2d(states), tf.tensor2d(targets), {
            batch_size: this.batch_size,
            epochs: 1,
            verbose: 0
        });
    }

    load_model(name) {
        this.model.loadLayersModel(name);
    }

    save_model(name) {
        this.model.save(name);
    }

    /********************************* public *********************************/

}