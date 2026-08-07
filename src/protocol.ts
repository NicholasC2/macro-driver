import { USB } from "./types";

const PACKET_SIZE = 64;
const PAYLOAD_OFFSET = 1;

export namespace Protocol {

    export function encode(packet: USB.Packet): number[] {
        const data = new Array(PACKET_SIZE).fill(0);

        data[0] = packet.type;

        switch (packet.type) {

            case USB.PacketType.KEY: {
                data[PAYLOAD_OFFSET] = packet.key;
                data[PAYLOAD_OFFSET + 1] = packet.pressed ? 1 : 0;
                break;
            }


            case USB.PacketType.KNOB: {
                data[PAYLOAD_OFFSET] = packet.knob;
                data[PAYLOAD_OFFSET + 1] =
                    packet.direction > 0 ? 1 : 255;
                break;
            }


            case USB.PacketType.KNOB_PRESS: {
                data[PAYLOAD_OFFSET] = packet.knob;
                data[PAYLOAD_OFFSET + 1] =
                    packet.pressed ? 1 : 0;
                break;
            }


            case USB.PacketType.SET_RGB: {
                data[PAYLOAD_OFFSET] = packet.rgbType;

                data[PAYLOAD_OFFSET + 1] =
                    Math.max(0, Math.min(255, packet.r));

                data[PAYLOAD_OFFSET + 2] =
                    Math.max(0, Math.min(255, packet.g));

                data[PAYLOAD_OFFSET + 3] =
                    Math.max(0, Math.min(255, packet.b));

                data[PAYLOAD_OFFSET + 4] =
                    Math.max(0, Math.min(255, packet.speed));

                break;
            }
        }

        return data;
    }


    export function decode(data: number[]): USB.Packet {

        if (data.length < 3) {
            throw new Error("Invalid HID packet size");
        }


        switch (data[0]) {

            case USB.PacketType.KEY:
                return {
                    type: USB.PacketType.KEY,

                    key:
                        data[PAYLOAD_OFFSET] ?? 255,

                    pressed:
                        data[PAYLOAD_OFFSET + 1] === 1
                };


            case USB.PacketType.KNOB:
                return {
                    type: USB.PacketType.KNOB,

                    knob:
                        data[PAYLOAD_OFFSET] ?? 0,

                    direction:
                        data[PAYLOAD_OFFSET + 1] === 1
                            ? 1
                            : -1
                };


            case USB.PacketType.KNOB_PRESS:
                return {
                    type: USB.PacketType.KNOB_PRESS,

                    knob:
                        data[PAYLOAD_OFFSET] ?? 0,

                    pressed:
                        data[PAYLOAD_OFFSET + 1] === 1
                };


            case USB.PacketType.SET_RGB:
                return {
                    type: USB.PacketType.SET_RGB,

                    rgbType:
                        data[PAYLOAD_OFFSET] ?? 0,

                    r:
                        data[PAYLOAD_OFFSET + 1] ?? 0,

                    g:
                        data[PAYLOAD_OFFSET + 2] ?? 0,

                    b:
                        data[PAYLOAD_OFFSET + 3] ?? 0,

                    speed:
                        data[PAYLOAD_OFFSET + 4] ?? 0
                };


            default:
                throw new Error(
                    `Unknown packet type: ${data[0]}`
                );
        }
    }
}