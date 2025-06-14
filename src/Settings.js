import { useFocusEffect } from '@react-navigation/native';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, View, Text, StyleSheet, TouchableOpacity, Switch, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker'
import Slider from '@react-native-community/slider';
import fs from './FileAccess'
import util from './utils';

const SettingsScreen = ({ navigation }) => {
    const [minTone, setMinTone] = useState(55)
    const [maxTone, setMaxTone] = useState(72)
    const [playSample, setPlaySample] = useState(false)
    const [enablePhoto, setEnablePhoto] = useState(true)
    const [count, setCount] = useState(5)
    const [rangeMode, setRangeMode] = useState("Normal")
    const [isModalVisible, setModalVisible] = useState(false)

    const [minTempTone, setMinTempTone] = useState(minTone)
    const [maxTempTone, setMaxTempTone] = useState(maxTone)
    const [rangeError, setRangeError] = useState("")

    const saveTimer = useRef(null);

    const tonePresets = [
        {
            name: "Old Guy Bass",
            minTone: 36,
            maxTone: 55,
        },
        {
            name: "Normal",
            minTone: 57,
            maxTone: 72,
        },
        {
            name: "High-Pitched Kid",
            minTone: 60,
            maxTone: 84,
        },
        {
            name: "Developer",
            minTone: minTone,
            maxTone: maxTone,
        },
    ];

    const tonesInRange = Array.from({ length: 108 - 21 + 1 }, (_, i) => {
        const midi = i + 21;
        return {
            midi,
            noteName: util.midiToNoteName(midi),
        };
    });
    useEffect(() => {
        console.log("playSample changed:", playSample);
    }, [playSample]);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                console.log("before settings load")
                const s = await fs.get_all_settings()
                if ("mode" in s) {
                    console.log("mode: " + s["mode"])
                    setRangeMode(s["mode"])
                }
                if ("enable_photo" in s) {
                    console.log("update enable_photo:" + s["enable_photo"])
                    setEnablePhoto(s["enable_photo"] === "true" || s["enable_photo"] === true);
                }
                if ("play_sample" in s) {
                    console.log("update play_sample:" + s["play_sample"])
                    setPlaySample(s["play_sample"] === "true" || s["play_sample"] === true);
                    console.log("playSample:" + playSample)
                }
                if ("minTone" in s && s["minTone"]) {
                    console.log("update minTone:" + s["minTone"])
                    setMinTone(s["minTone"])
                }
                if ("maxTone" in s && s["maxTone"]) {
                    console.log("update maxTone:" + s["maxTone"])
                    setMaxTone(s["maxTone"])
                }
            })();
        }, [])
    );

    const on_enable_photo_changed = (v) => {
        setEnablePhoto(v)
        fs.save_settings("enable_photo", v)
    }
    const on_play_sample_changed = (v) => {
        console.log("on_play_sample_changed " + v)
        fs.save_settings("play_sample", v)
        setPlaySample(v)
    }


    const on_people_count_changed = (v) => {
        setCount(v);

        if (saveTimer.current) {
            clearTimeout(saveTimer.current);
        }

        saveTimer.current = setTimeout(() => {
            fs.save_settings("result_people", v);
            console.log("result_people: ", v);
        }, 100);
    };

    const on_range_changed = (v) => {
        if (v.name == "Developer") {
            setMinTempTone(minTone)
            setMaxTempTone(maxTone)
            showOverlay()
        } else {
            setRangeMode(v.name);
            updateToneRange(v.name, v.minTone, v.maxTone)
        }
    }

    const updateToneRange = (mode, min, max) => {
        (async () => {
            await fs.save_settings("mode", mode)
            await fs.save_settings("minTone", min)
            await fs.save_settings("maxTone", max)
            console.log("save tone range")
        })();

    }
    const showOverlay = () => {
        setModalVisible(true);
    }

    const hideOverlay = () => {
        setModalVisible(false);
    }

    const confirmTone = () => {
        if (maxTempTone < minTempTone) {
            setRangeError(util.midiToNoteName(minTempTone) + " is higher than " + util.midiToNoteName(maxTempTone))
            return
        } else {
            setRangeError("")
            setRangeMode("Developer")
            setMinTone(minTempTone)
            setMaxTone(maxTempTone)
            updateToneRange("Developer", minTempTone, maxTempTone)
        }
        hideOverlay()
    }
    const cancelTone = () => {
        setRangeError("")
        hideOverlay()
    }

    return (
        <View style={styles.page}>
            <View style={styles.menu}>
                <Button
                    title='Go Back'
                    onPress={() => navigation.navigate('Home')}
                />
            </View>
            <View style={styles.settings_container}>
                <View style={styles.title_container}>
                    <Text style={styles.title}>Preferences</Text>
                </View>
                <>
                    <Text style={styles.item_title}>Target Pitch Range</Text>
                    {tonePresets.map((v) => (
                        <TouchableOpacity key={v.name} onPress={() => { on_range_changed(v) }} style={styles.range_button} >
                            <View style={[styles.radioCircle, rangeMode === v.name && styles.radioSelected]} />
                            <Text style={styles.range_item}>{v.name}</Text>
                            <Text style={styles.range_item}>
                                {isNaN(v.minTone) || isNaN(v.maxTone)
                                    ? "? - ?"
                                    : `${util.midiToNoteName(v.minTone)} - ${util.midiToNoteName(v.maxTone)}`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </>

                <Modal
                    visible={isModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={hideOverlay}
                >
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContent}>
                            <Text style={{ marginBottom: 8 }}>
                                Select Tone Range:
                                {rangeError ? (
                                    <Text style={{ color: 'red' }}> {rangeError}</Text>
                                ) : null}
                            </Text>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                {/* Min Tone Picker */}
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={{ marginBottom: 4, textAlign: 'center' }}>Min</Text>
                                    <Picker
                                        selectedValue={minTempTone}
                                        onValueChange={(value) => setMinTempTone(value)}
                                    >
                                        {tonesInRange.map((tone) => (
                                            <Picker.Item key={tone.midi} label={tone.noteName} value={tone.midi} />
                                        ))}
                                    </Picker>
                                </View>

                                {/* Max Tone Picker */}
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={{ marginBottom: 4, textAlign: 'center' }}>Max</Text>
                                    <Picker
                                        selectedValue={maxTempTone}
                                        onValueChange={(value) => setMaxTempTone(value)}
                                    >
                                        {tonesInRange.map((tone) => (
                                            <Picker.Item key={tone.midi} label={tone.noteName} value={tone.midi} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                                <Button title="Cancel" onPress={cancelTone} />
                                <Button title="Confirm" onPress={confirmTone} />
                            </View>
                        </View>
                    </View>
                </Modal>
                <View style={styles.radio_container}>
                    <Text>Sample Sound Playback: {playSample ? 'On' : 'Off'}</Text>
                    <Switch
                        trackColor={{ false: '#ccc', true: '#4caf50' }}
                        thumbColor={playSample ? '#ffffff' : '#ffffff'}
                        ios_backgroundColor="#ccc"
                        onValueChange={on_play_sample_changed}
                        value={playSample}
                    />
                </View>
                <View style={styles.radio_container}>
                    <Text>Enable Photo Capture: {enablePhoto ? 'On' : 'Off'}</Text>
                    <Switch
                        trackColor={{ false: '#ccc', true: '#4caf50' }}
                        thumbColor={enablePhoto ? '#ffffff' : '#ffffff'}
                        ios_backgroundColor="#ccc"
                        onValueChange={on_enable_photo_changed}
                        value={enablePhoto}
                    />
                </View>
                <View style={styles.result_container}>
                    <Text style={styles.label}>Number of Results to Show</Text>
                    <Text style={styles.value}>{count} {count === 1 ? 'person' : 'people'}</Text>
                    <Slider
                        style={styles.slider}
                        minimumValue={1}
                        maximumValue={10}
                        step={1}
                        value={count}
                        onValueChange={on_people_count_changed}
                        minimumTrackTintColor="#1fb28a"
                        maximumTrackTintColor="#d3d3d3"
                        thumbTintColor="#1a9274"
                    />
                </View>
            </View>
        </View >
    )
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        flexDirection: "column",
    },
    title_container: {
        alignItems: "center",
        paddingVertical: 10,
    },
    title: {
        justifyContent: "center",
        alignItems: "center",
        fontSize: 24,
    },
    menu: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    item_title: {
        fontSize: 18,
        marginBottom: 10,
    },
    range_item: {
        width: 160,
        marginLeft: 30,
        minHeight: 24,
    },
    settings_container: {
    },
    range_button: {
        flexDirection: 'row',
    },
    radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#777',
    },
    radioSelected: {
        backgroundColor: '#555',
    },
    radio_container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
    },
    result_container: {
        padding: 16,
        backgroundColor: '#fff',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    value: {
        fontSize: 18,
        marginBottom: 12,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
})

export default SettingsScreen