import bleno from "@abandonware/bleno";
import { characteristicUUID, serviceUUID } from './constants';

bleno.on("stateChange", async state => {
    console.log(`State change to ${state}`);
    if (state === "poweredOn") {
        console.log("BLE is powered on, starting advertising...")
        bleno.startAdvertising(
            "NICO",
            [characteristicUUID],
            (error) => {
                if (error) console.error("Error starting advertising: " + error.message);
            });
    }
    else {
        console.log("BLE is powered off, stopping advertising...")
        bleno.stopAdvertising();
    }
});


let characteristic = new bleno.Characteristic({
    uuid: characteristicUUID,
    properties: ["read", "write", "notify",],
    value: null,
    onReadRequest: (offset, callback) => {
        console.log("Read request received");
        callback(bleno.Characteristic.RESULT_SUCCESS, Buffer.from("Hello World"));
    },
    onWriteRequest: (data, offset, withoutResponse, callback) => {
        console.log("Write request received: " + data);
        callback(bleno.Characteristic.RESULT_SUCCESS);
    },
    onNotify: () => {
        console.log("Notify request received");
    },
    onSubscribe: (maxValueSize, updateValueCallback) => {
        console.log("Subscribe request received");
    }


});

let service = new bleno.PrimaryService({
    uuid: serviceUUID,
    characteristics: [characteristic]
});

bleno.on("advertisingStart", (error) => {
    console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));
    if (!error) {
        console.log("Advertising started, setting services...");
        bleno.setServices([service], (error) => {
            if (error) console.error("Error setting services: " + error);
            console.log('Setting service: ' + (error ? 'error ' + error : 'success'));
        });
    }
});


bleno.on("advertisingStop", () => {
    console.error("Advertising stopped");
}); 