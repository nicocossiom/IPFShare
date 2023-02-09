"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const noble_1 = __importDefault(require("@abandonware/noble"));
const constants_1 = require("./constants");
noble_1.default.on("stateChange", (state) => __awaiter(void 0, void 0, void 0, function* () {
    if (state === "poweredOn") {
        console.log("BLE is powered on, starting scan...");
        yield noble_1.default.startScanningAsync();
    }
}));
noble_1.default.on("discover", (peripheral) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Found peripheral: " + peripheral);
    yield peripheral.connectAsync()
        .catch()
        .then(() => __awaiter(void 0, void 0, void 0, function* () {
        console.log("Connected to peripheral: " + peripheral.address);
        yield peripheral.discoverServicesAsync([constants_1.serviceUUID])
            .catch(() => console.error("Error discovering services for peripheral: " + peripheral.address))
            .then((services) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("Discovered services for peripheral: " + services);
        }));
        yield peripheral.disconnectAsync()
            .catch(() => console.error("Error disconnecting from peripheral: " + peripheral.address))
            .then(() => console.log("Disconnected from peripheral: " + peripheral.address));
    }));
}));
noble_1.default.on("scanStart", () => {
    console.log("Scan started");
});
noble_1.default.on("scanStop", () => {
    console.log("Scan stopped");
});
noble_1.default.on('warning', (message) => console.warn(message));
//# sourceMappingURL=main.js.map