
const { parentPort, workerData } = require('worker_threads');

const NS_PER_MS = 1_000_000n;
const intervalMs = 1000n;
const intervalNs = intervalMs * NS_PER_MS;

// Initial sync with server time
const serverNow = BigInt(workerData.serverNow); // in ms
const clientHrStart = process.hrtime.bigint(); // in ns

// Returns synced server time in ms, based on monotonic time
function getServerTime() {
    const hrNow = process.hrtime.bigint();
    const elapsedNs = hrNow - clientHrStart;
    return serverNow + (elapsedNs / NS_PER_MS);
}

function startAccurateTimer() {
    try {
        let expected = process.hrtime.bigint() + intervalNs;

        function tick() {
            const hrNow = process.hrtime.bigint();
            const serverTime = getServerTime();
            const driftNs = hrNow - expected;

            parentPort.postMessage({ serverTime: Number(serverTime), drift: Number(driftNs) / 1_000_000 });

            expected += intervalNs;

            const delayMs = Math.max(0, Number(expected - process.hrtime.bigint()) / 1_000_000);
            setTimeout(tick, delayMs);
        }

        setTimeout(tick, Number(intervalMs));
    } catch (error) {
        console.error('Timer error:', error);
    }
}

startAccurateTimer();



// const { parentPort } = require('worker_threads');


// // setInterval(() => {
// //     parentPort.postMessage(`Tick at ${new Date().toISOString()}`);
// // }, 1000);


// let timerInterval;
// let time = 0;
// parentPort.on('message', (message) => {
//     // time = new Date(message).getTime();
//     time = new Date(message).getTime();
//     (function loop() {
//         timerInterval = setInterval(() => {
//             time += 1000;
//             parentPort.postMessage({ time });
//             // loop();
//         }, 1000);
//     })();
// });