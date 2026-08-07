[Hardware I Used](<https://www.aliexpress.com/item/1005003500083583.html>)

to flash use `qmk flash -kb winry/winry315 -km default -e 'EXTRAFLAGS=-DSERIAL_NUMBER=\"MP001\"'` and replace MP001 with the desired serial number

keymap.c:
```c
#include QMK_KEYBOARD_H
#include "raw_hid.h"

enum {
    PACKET_KEY = 10,
    PACKET_KNOB = 11,
    PACKET_KNOB_PRESS = 12,
};


// clang-format off
const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    [0] = LAYOUT_top(
            KC_NO, KC_NO, KC_NO,
        KC_NO, KC_NO, KC_NO, KC_NO, KC_NO,
        KC_NO, KC_NO, KC_NO, KC_NO, KC_NO,
        KC_NO, KC_NO, KC_NO, KC_NO, KC_NO
    ),
};
// clang-format on


bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    static const uint8_t key_map[4][5] = {
        { 0,  1,  2,  3,  4 },
        { 5,  6,  7,  8,  9 },
        {10, 11, 12, 13, 14 },
        {16, 17, 15 } // knobs
    };

    uint8_t row = record->event.key.row;
    uint8_t col = record->event.key.col;

    uint8_t key_number = key_map[row][col];

    uint8_t data[32] = {0};

    if (key_number >= 15 && key_number <= 17) {
        data[0] = PACKET_KNOB_PRESS;
        data[1] = key_number - 15;
        data[2] = record->event.pressed ? 1 : 0;
    } else {
        data[0] = PACKET_KEY;
        data[1] = key_number;
        data[2] = record->event.pressed ? 1 : 0;
    }

    raw_hid_send(data, sizeof(data));

    return false;
}

bool encoder_update_user(uint8_t index, bool clockwise) {
    uint8_t data[32] = {0};

    data[0] = PACKET_KNOB;
    data[1] = index;
    data[2] = clockwise ? 1 : 255;

    raw_hid_send(data, sizeof(data));

    return false;
}```
