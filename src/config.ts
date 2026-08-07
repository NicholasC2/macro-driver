import { defineConfig } from "./types";

export default [
    defineConfig({
        id: "MP001",
        VID: 0xF1F1, // winry/winry315 default
        PID: 0x0315, // winry/winry315 default
    
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
    })
];
