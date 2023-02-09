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
noble_1.default.on("stateChange", state => {
    if (state === "poweredOn") {
        console.log("BLE is powered on, starting scan...");
        noble_1.default.startScanning([constants_1.serviceUUID], false);
    }
    else {
        console.log("BLE is powered off, stopping scan...");
        noble_1.default.stopScanning();
    }
});
noble_1.default.on("discover", (peripheral) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Discovered peripheral: ${peripheral.advertisement.localName} ${peripheral.address} ${peripheral.id}`);
    console.log("Found peripheral " + peripheral.address + " with knowledge of the service");
    peripheral.connect((error) => {
        if (error) {
            console.error(error);
            return;
        }
        console.log('Connected to', peripheral.id);
        // specify the services and characteristics to discover
        const serviceUUIDs = [constants_1.serviceUUID];
        const characteristicUUIDs = [constants_1.characteristicUUID];
        peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs, characteristicUUIDs, (error, services, characteristics) => {
            if (error) {
                console.error(error);
                return;
            }
            console.log('Discovered services and characteristics');
            const characteristic = characteristics[0];
            characteristic.read((error, data) => {
                if (error) {
                    console.error(error);
                    return;
                }
                console.log('Read data: ' + data.toString('utf8'));
                peripheral.disconnect(() => {
                    console.log('Disconnected from', peripheral.id);
                });
            });
        });
    });
}));
noble_1.default.on("scanStart", () => {
    console.log("Scan started");
});
noble_1.default.on("scanStop", () => {
    console.log("Scan stopped");
});
noble_1.default.on('warning', (message) => console.warn(message));
//# sourceMappingURL=discoverer.js.map