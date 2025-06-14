const util = {
    midiToNoteName: (midiNumber) => {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNumber / 12) - 1; // MIDIの0はC-1
        const note = notes[midiNumber % 12]
        return `${note}${octave}`;
    },
    midiToFrequency: (midiTone) => {
        if (typeof midiTone !== 'number' || midiTone < 0 || midiTone > 127) {
            throw new Error('Invalid MIDI tone: must be a number between 0 and 127.');
        }
        return 440 * Math.pow(2, (midiTone - 69) / 12);
    },
    calcDiffCent: (measuredHz, targetHz) => {
        const cent = 1200 * Math.log2(measuredHz / targetHz);
        console.log("t: " + targetHz + " m:" + measuredHz + " c:" + cent)
        return cent
    },
    frequencyToMidiNote: (frequency) => {
        const midi = 69 + 12 * Math.log2(frequency / 440);
        return Math.min(108, Math.max(0, Math.round(midi)));
    }
}

export default util