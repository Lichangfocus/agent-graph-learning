/**
 * npm run log -- <node> <action> [jsonPayload] [--device mac]
 * 例：LEARN_DATA_DIR=../learn-data npm run log -- s1 lit '{"score":3}' --device mac
 * 只追加写 <data>/log/<device>.jsonl；设备名默认取 LEARN_DEVICE 或主机名。
 */
import { appendLogEvent, deviceName, sanitizeDevice } from "../lib/userpack";
import { dataDir } from "../lib/paths";
import { LOG_ACTIONS } from "../lib/schemas/atlas";

const args = process.argv.slice(2);
const di = args.indexOf("--device");
const device = di >= 0 ? sanitizeDevice(args[di + 1] ?? "") : deviceName();
const [node, action, payload] = di >= 0 ? args.filter((_, i) => i !== di && i !== di + 1) : args;
if (!node || !LOG_ACTIONS.includes(action as never)) {
  console.error(`用法：npm run log -- <node> <${LOG_ACTIONS.join("|")}> [jsonPayload] [--device mac]`);
  process.exit(64);
}
const event = appendLogEvent({ ts: new Date().toISOString(), node, action: action as never, payload: payload ? JSON.parse(payload) : undefined }, device);
console.log(`已写入 ${dataDir()}/log/${device}.jsonl：${JSON.stringify(event)}`);
