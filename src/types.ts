import { HID } from "node-hid";
import { Protocol } from "./protocol";
import notifier from "node-notifier";

export interface Color {
    r: number;
    g: number;
    b: number;
}

export enum RGBType {
    PULSE = 0,
    STATIC = 1,
    BREATHING = 2,
    SPARKLING = 3,
}

export interface RGB {
    type: RGBType;
    color: Color;
    speed: number;
}

export type MacroHandler = (
    manager: MacroPadManager
) => void | Promise<void>;


export interface KeyMacro {
    press?: MacroHandler;
    release?: MacroHandler;
}


export interface KeyLayer {
    name: string;
    keys: Map<number, KeyMacro>;

    press?: (
        manager: MacroPadManager,
        key: number
    ) => void | Promise<void>;

    release?: (
        manager: MacroPadManager,
        key: number
    ) => void | Promise<void>;

    onLoad?: MacroHandler;
    onUnload?: MacroHandler;
}


export interface KnobMacro {
    clockwise?: MacroHandler;
    counterClockwise?: MacroHandler;

    press?: MacroHandler;
    release?: MacroHandler;
}


export namespace USB {
    export enum PacketType {
        KEY = 10,
        KNOB = 11,
        KNOB_PRESS = 12,
        SET_RGB = 13
    }

    export type Packet =
        | {
            type: PacketType.KEY;
            key: number;
            pressed: boolean;
        }

        | {
            type: PacketType.KNOB;
            knob: number;
            direction: -1 | 1;
        }

        | {
            type: PacketType.KNOB_PRESS;
            knob: number;
            pressed: boolean;
        }

        | {
            type: PacketType.SET_RGB;
            rgbType: RGBType;
            r: number;
            g: number;
            b: number;
            speed: number;
        };
}



export interface MacroPadConfig {
    readonly id: string;
    defaultLayer?: number;

    /**
     * Keys that exist on every layer
     */
    persistentKeys?: Map<number, KeyMacro>;
    layers?: KeyLayer[];
    knobs?: Map<number, KnobMacro>;
    rgb?: RGB;

    keyPress?: (
        manager: MacroPadManager,
        key: number
    ) => void | Promise<void>;


    keyRelease?: (
        manager: MacroPadManager,
        key: number
    ) => void | Promise<void>;
}



export class MacroPadManager {
    private currentLayer: number;
    private rgb: RGB;

    public connected = false;

    public readonly persistentKeys: Map<number, KeyMacro>;
    public readonly layers: KeyLayer[];
    public readonly knobs: Map<number, KnobMacro>;

    constructor(
        public readonly config: MacroPadConfig,
        public hid: HID
    ) {
        this.persistentKeys = config.persistentKeys ?? new Map();
        this.layers = config.layers ?? [];
        this.currentLayer = Math.max(0, Math.min(config.defaultLayer ?? 0, Math.max(0, this.layers.length - 1)));
        this.knobs = config.knobs ?? new Map();
        this.rgb = structuredClone(config.rgb ?? DEFAULT_RGB);
    }

    get id() {
        return this.config.id;
    }

    getRGB(): RGB {
        return structuredClone(this.rgb);
    }

    setRGB(rgb: RGB) {
        this.hid.write(
            Protocol.encode({
                type: USB.PacketType.SET_RGB,

                rgbType: rgb.type,

                speed: rgb.speed,

                r: rgb.color.r,
                g: rgb.color.g,
                b: rgb.color.b
            })
        );

        this.rgb = structuredClone(rgb);
    }

    getCurrentLayer() {
        return this.currentLayer;
    }

    getKey(key: number): KeyMacro | undefined {
        const layer = this.layers[this.currentLayer];

        return (this.persistentKeys.get(key) ?? layer?.keys.get(key));
    }

    async setLayer(layer: number) {
        if (!this.layers.length) {
            this.currentLayer = 0;
            return;
        }

        const next = Math.max(0, Math.min(layer, this.layers.length - 1));
        if (next === this.currentLayer)return;

        await this.layers[this.currentLayer]?.onUnload?.(this);
        this.currentLayer = next;
        await this.layers[this.currentLayer]?.onLoad?.(this);

        notifier.notify({
            title: `${this.id} Layer Change`,
            message: `set to layer "${this.layers[this.currentLayer]?.name || this.currentLayer}"`,
            time: 2
        })

        console.log(`[MacroPad] Loaded layer ${this.layers[this.currentLayer]?.name || this.currentLayer} for "${this.id}"`);
    }

    nextLayer() {
        if (!this.layers.length) return;

        return this.setLayer((this.currentLayer + 1) % this.layers.length);
    }

    previousLayer() {
        if (!this.layers.length) return;

        return this.setLayer((this.currentLayer - 1 + this.layers.length) % this.layers.length);
    }

    addLayer(layer: KeyLayer) {
        this.layers.push(layer);
    }
}



const DEFAULT_RGB: RGB = {
    type: RGBType.STATIC,
    speed: 1,
    color: {
        r: 255,
        g: 255,
        b: 255
    }
};