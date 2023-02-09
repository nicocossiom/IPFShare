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
const bleno_1 = __importDefault(require("@abandonware/bleno"));
const constants_1 = require("./constants");
bleno_1.default.on("stateChange", (state) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`State change to ${state}`);
    if (state === "poweredOn") {
        console.log("BLE is powered on, starting advertising...");
        bleno_1.default.startAdvertising("NICO", [constants_1.characteristicUUID], (error) => {
            if (error)
                console.error("Error starting advertising: " + error.message);
        });
    }
    else {
        console.log("BLE is powered off, stopping advertising...");
        bleno_1.default.stopAdvertising();
    }
}));
let characteristic = new bleno_1.default.Characteristic({
    uuid: constants_1.characteristicUUID,
    properties: ["read", "write", "notify",],
    value: null,
    onReadRequest: (offset, callback) => {
        console.log("Read request received");
        callback(bleno_1.default.Characteristic.RESULT_SUCCESS, Buffer.from("Hello World"));
    },
    onWriteRequest: (data, offset, withoutResponse, callback) => {
        console.log("Write request received: " + data);
        callback(bleno_1.default.Characteristic.RESULT_SUCCESS);
    },
    onNotify: () => {
        console.log("Notify request received");
    },
    onSubscribe: (maxValueSize, updateValueCallback) => {
        console.log("Subscribe request received");
    }
});
let service = new bleno_1.default.PrimaryService({
    uuid: constants_1.serviceUUID,
    characteristics: [characteristic]
});
bleno_1.default.on("advertisingStart", (error) => {
    console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));
    if (!error) {
        console.log("Advertising started, setting services...");
        bleno_1.default.setServices([service], (error) => {
            if (error)
                console.error("Error setting services: " + error);
            console.log('Setting service: ' + (error ? 'error ' + error : 'success'));
        });
    }
});
bleno_1.default.on("advertisingStop", () => {
    console.error("Advertising stopped");
});
//# sourceMappingURL=advertiser.js.map