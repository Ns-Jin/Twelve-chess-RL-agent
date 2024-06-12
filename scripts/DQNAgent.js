

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

    toArray() {
        const arr = [];
        let current = this.head;
        while (current) {
            arr.push(current.value);
            current = current.next;
        }
        return arr;
    }
}



export class DQNAgent {
    constructor(turn, state_size, action_size, model_architecture, discount_factor, learning_rate, batch_size, render) {
        this.turn = turn;
        
        this.render = render;

        this.state_size = state_size;
        this.action_size = action_size;

        // DQN 하이퍼파라미터
        this.discount_factor = discount_factor;  // 0.99
        this.learning_rate = learning_rate;      // 0.001
        this.epsilon = 1.0;
        this.epsilon_min = 0.005;
        this.epsilon_decay = (this.epsilon - this.epsilon_min) / 500000;
        this.batch_size = batch_size;            // 64
        this.train_start = 500;                 // 학습 시작 시점
        this.model_architecture = model_architecture;

        // 리플레이 메모리, 최대 크기 설정
        this.queue_len_max = 2000;
        this.memory = new Deque(this.queue_len_max);

        // 학습 모델, 타겟 모델 똑같이 생성
        this.model = this.build_model(model_architecture);
        this.target_model = this.build_model(model_architecture);

        // 타겟 모델 업데이트 (학습 모델로 덮어씌움)
        this.update_target_model();
    }

    /********************************* private *********************************/
    build_model(model_architecture) {
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: parseInt(model_architecture[0]), inputShape: [this.state_size / 2], activation: 'relu', kernelInitializer: 'heUniform' }));
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

    extract_board_state(state) {
        return state.slice(2, 6).flat().map(cell => cell.num);
    }

    /* 현재 state에서 action 선택
        parameter: state
            현재 상태를 선택
        parameter: possible_actions
            현재 상태에서 가능한 actions
        return: action
            현재 상태에서 수행할 수 있는 action을 반환 */
    get_action(state, possible_actions) {
        if (Math.random() <= this.epsilon) {
            const random_index = Math.floor(Math.random() * possible_actions.length);
            return possible_actions[random_index];
        }
        else {
            return tf.tidy(() => {
                const board_state = this.extract_board_state(state);
                const q_values = this.model.predict(tf.tensor2d(board_state, [1, this.state_size / 2]));
                const q_values_array = q_values.arraySync()[0];
                q_values.dispose();
                
                // 선택 가능한 행동들만 고려하도록 마스킹 적용
                const masked_q_values = q_values_array.map((value, index) => {
                    return possible_actions.includes(index) ? value : -Infinity;
                });

                // 최대값의 인덱스를 선택
                const max_index = masked_q_values.indexOf(Math.max(...masked_q_values));
                return max_index;
            });
        }
    }


    append_sample(state, action, reward, next_state, done) {
        this.memory.push({ state, action, reward, next_state, done });
        if (this.epsilon > this.epsilon_min) {
            this.epsilon -= this.epsilon_decay;
        }
    }

    get_random_indices(array_length, num_idices) {
        const indices = [];
        while (indices.length < num_idices) {
            const random_index = Math.floor(Math.random() * array_length);
            if (!indices.includes(random_index)) {
                indices.push(random_index);
            }
        }
        return indices;
    }
    
    get_random_samples(array, indices) {
        return indices.map(index => array[index]);
    }

    async train_model() {
        if (this.memory.length < this.batch_size) return;

        const memory_array = this.memory.toArray();
        
        const randomIndices = this.get_random_indices(memory_array.length, this.batch_size);
        const batch = this.get_random_samples(memory_array, randomIndices);

        // const batch = tf.util.shuffle(memoryArray).slice(0, this.batch_size);
        const states = batch.map(sample => this.extract_board_state(sample.state));
        const next_states = batch.map(sample => this.extract_board_state(sample.next_state));

        const targets = tf.tidy(() => {
            const current_q_values = this.model.predict(tf.tensor2d(states, [states.length, this.state_size / 2]));
            const next_q_values = this.target_model.predict(tf.tensor2d(next_states, [next_states.length, this.state_size / 2]));
    
            const targets_array = current_q_values.arraySync().map((currentQ, index) => {
                const {action, reward, done} = batch[index];
                currentQ[action] = done ? reward : (reward + this.discount_factor * Math.max(...next_q_values.arraySync()[index]));
                return currentQ;
            });
    
            current_q_values.dispose();
            next_q_values.dispose();
    
            return targets_array;
        });
    
        // Performing the asynchronous operation outside of tf.tidy
        const states_tensor = tf.tensor2d(states, [states.length, states[0].length]);
        const targets_tensor = tf.tensor2d(targets, [targets.length, this.action_size]);

        await this.model.fit(
            states_tensor, 
            targets_tensor, 
            {
                batch_size: this.batch_size,
                epochs: 1,
                verbose: 0
            }
        );

        // Dispose the tensors after use
        states_tensor.dispose();
        targets_tensor.dispose();
    }

    async save_model(name) {
        await this.model.save(`indexeddb://${name}`);

        // 파라미터를 JSON으로 저장
        const params = {
            turn: this.turn,
            state_size: this.state_size,
            action_size: this.action_size,
            model_architecture: this.model_architecture,
            discount_factor: this.discount_factor,
            learning_rate: this.learning_rate,
            batch_size: this.batch_size,
            render: this.render
        };

        // IndexedDB에 파라미터 저장
        const dbRequest = indexedDB.open('DQNAgentDB', 1);

        dbRequest.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('agentParams')) {
                db.createObjectStore('agentParams', { keyPath: 'name' });
            }
        };

        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['agentParams'], 'readwrite');
            const store = transaction.objectStore('agentParams');
            store.put({ name, params });
        };

        dbRequest.onerror = function(event) {
            console.error('Error opening IndexedDB:', event.target.errorCode);
        };
    }

    async load_model(name) {
        this.model = await tf.loadLayersModel(`indexeddb://${name}`);
    }

    async save_model_to_file(name) {
        // 모델을 파일로 저장
        await this.model.save(`downloads://${name}`);
    
        // 파라미터를 JSON으로 저장
        const params = {
            turn: this.turn,
            state_size: this.state_size,
            action_size: this.action_size,
            model_architecture: this.model_architecture,
            discount_factor: this.discount_factor,
            learning_rate: this.learning_rate,
            batch_size: this.batch_size,
            render: this.render
        };
    
        // 파라미터를 Blob으로 변환
        const paramsBlob = new Blob([JSON.stringify({ name, params })], { type: 'application/json' });
    
        // 파라미터 파일 다운로드
        const a = document.createElement('a');
        a.href = URL.createObjectURL(paramsBlob);
        a.download = `${name}_params.json`;
        a.click();
    }
    
    async load_model_from_file(fileInput, paramsInput) {
        const modelUrl = '../models/model.json'; // 모델 파일 URL
        const paramsUrl = '../models/params.json';
    
        // 모델 파일 로드
        this.model = await tf.loadLayersModel(modelUrl);

        // 파라미터 파일 로드
        const response = await fetch(paramsUrl);
        const paramsText = await response.text();
        const { name, params } = JSON.parse(paramsText);

        // 파라미터를 객체에 적용
        this.turn = params.turn;
        this.state_size = params.state_size;
        this.action_size = params.action_size;
        this.model_architecture = params.model_architecture;
        this.discount_factor = params.discount_factor;
        this.learning_rate = params.learning_rate;
        this.batch_size = params.batch_size;
        this.render = params.render;
    }
    
    /********************************* public *********************************/

}