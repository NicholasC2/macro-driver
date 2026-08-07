import { defineConfig } from "./types";

export default [
    defineConfig({
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
    })
];
