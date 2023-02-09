import noble from '@abandonware/noble';
import { characteristicUUID, serviceUUID } from './constants';


noble.on("stateChange", state => {
    if (state === "poweredOn") {
        console.log("BLE is powered on, starting scan...")
        noble.startScanning([serviceUUID], false);
    }
    else {
        console.log("BLE is powered off, stopping scan...")
        noble.stopScanning();
    }
})

noble.on("discover", async peripheral => {
    console.log(`Discovered peripheral: ${peripheral.advertisement.localName} ${peripheral.address} ${peripheral.id}`);
    console.log("Found peripheral " + peripheral.address + " with knowledge of the service");
    peripheral.connect((error) => {
        if (error) {
            console.error(error);
            return;
        }
        console.log('Connected to', peripheral.id);
        // specify the services and characteristics to discover
        const serviceUUIDs = [serviceUUID];
        const characteristicUUIDs = [characteristicUUID];
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

});
noble.on("scanStart", () => {
    console.log("Scan started");
});

noble.on("scanStop", () => {
    console.log("Scan stopped");
});

noble.on('warning', (message: string) => console.warn(message));

