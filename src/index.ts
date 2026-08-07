import fs from "node:fs";
import path from "node:path";

import { HID, devicesAsync, Device } from "node-hid";

import { MacroPadConfig, MacroPadManager, USB } from "./types";
import { Protocol } from "./protocol";

const VID = 0xF1F1;
const PID = 0x0315;

function loadConfigs(file: string): MacroPadConfig[] {
    if (!fs.existsSync(file)) {
        throw new Error(`No config found at ${file}`);
    }

    const config = require(file);

    return config.default ?? config;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runMacroPad(config: MacroPadConfig) {
    async function getDevice(): Promise<Device | undefined> {
        const devices = await devicesAsync();

        return devices.find(d =>
            d.vendorId === VID &&
            d.productId === PID &&
            d.usagePage === 0xFF60 &&
            d.usage === 0x61 &&
            d.serialNumber === config.id
        );
    }

    let manager: MacroPadManager | undefined;

    function closeMacroPadConnection() {
        if (!manager) return;

        try {
            manager.hid.close();
        } catch {}

        manager.connected = false;
        manager = undefined;
    }

    function setupPacketHandler() {
        if(!manager) return;
        const current = manager;

        current.hid.on("data", raw => {
            try {
                const data: number[] = Array.from(raw);
                const packet = Protocol.decode(data);

                switch (packet.type) {
                    case USB.PacketType.KEY: {
                        const keyId = packet.key;
                        const key = current.getKey(keyId);

                        if (packet.pressed) {
                            key?.press?.(current);
                            current.layers[current.getCurrentLayer()]?.press?.(current, keyId);
                            current.config.keyPress?.(current, keyId);
                        } else {
                            key?.release?.(current);
                            current.layers[current.getCurrentLayer()]?.release?.(current, keyId);
                            current.config.keyRelease?.(current, keyId);
                        }

                        break;
                    }

                    case USB.PacketType.KNOB: {
                        const knob = current.knobs.get(packet.knob);

                        if (packet.direction > 0) knob?.clockwise?.(current);
                        else knob?.counterClockwise?.(current);

                        break;
                    }

                    case USB.PacketType.KNOB_PRESS: {
                        const knob = current.knobs.get(packet.knob);

                        if (packet.pressed) knob?.press?.(current);
                        else knob?.release?.(current);

                        break;
                    }
                }
            } catch (err) {
                console.error("[HID] Decode error:", err);
            }
        });

        current.hid.on("error", err => {
            console.error("[HID] Device error:",err);

            closeMacroPadConnection();
        });
    }

    while(true) {
        const device = await getDevice();
        
        if (!device || !device.path) {
            closeMacroPadConnection();

            await sleep(1000);
            continue;
        }

        if(!manager) {
            console.log(`[MacroPad] "${config.id}" Connecting...`);

            const hid = new HID(device.path);
            manager = new MacroPadManager(config, hid);
            setupPacketHandler();
            manager.connected = true;

            console.log(`[MacroPad] "${device?.serialNumber}" Connected`);

            await manager.layers[manager.getCurrentLayer()]?.onLoad?.(manager);
        }

        await sleep(1000);
    }
}

async function monitor(configs: MacroPadConfig[]) {
    const devices = (await devicesAsync()).filter(d => d.vendorId === VID && d.productId === PID && d.usagePage === 0xFF60 && d.usage === 0x61);

    console.log(`Config Devices: \n${configs.map(c => " "+c.id).join("\n")}`)
    console.log(`Connected Devices: \n${devices.map(d => " "+d.serialNumber).join("\n")}`)

    try {
        await Promise.all(
            configs.map(runMacroPad)
        );
    } catch(err) {
        console.error("[MacroPad]",err);
    }
}

async function main() {
    console.log("Starting...");

    if (process.getuid?.() !== 0) {
        console.warn("Warning: USB permissions may fail");
    }

    const configPath = (process as any).pkg
        ? path.join(path.dirname(process.execPath), "config.js")
        : path.join(process.cwd(), "dist", "config.js");

    console.log(`Config path: ${configPath}`);

    await monitor(loadConfigs(configPath));
}


main().catch(err => {
    console.error(err);
    process.exit(1);
});
