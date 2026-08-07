import { MacroPadConfig } from "./types";

const mp1 = {
    id: "MP001",

    persistentKeys: new Map([
        [
            4,
            {
                press: pad => pad.nextLayer()
            }
        ]
    ]),

    knobs: new Map([]),

    layers: [
        {
            name: "general",

            keys: new Map([])
        }
    ],
} satisfies MacroPadConfig;

export default [
    mp1
] satisfies MacroPadConfig[];
