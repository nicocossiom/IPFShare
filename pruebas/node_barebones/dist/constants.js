"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.characteristicUUID = exports.serviceUUID = void 0;
const util_1 = __importDefault(require("util"));
// export const serviceUUID = "483142d3-a958-4942-93f5-3a4913afc731";
exports.serviceUUID = "ec00";
exports.characteristicUUID = "ec0e";
exports.sleep = util_1.default.promisify(setTimeout);
//# sourceMappingURL=constants.js.map