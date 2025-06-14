import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Alert, Button, Text, View, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { Picker } from '@react-native-picker/picker'
import fs from './FileAccess'
import util from './utils'
import db from './db';

const HomeScreen = ({ navigation }) => {
    const bg = require('../assets/background.jpg')
    const [hasPermission, setHasPermission] = useState(false)
    const [micPermission, setMicPermission] = useState(false)
    const [enablePhoto, setEnablePhoto] = useState(true)

    const [minTone, setMinTone] = useState(55);
    const [maxTone, setMaxTone] = useState(72);

    console.log("minTone:" + minTone)
    const [mode, setMode] = useState('fixed'); // fixed, random, individual
    const [selectedTone, setSelectedTone] = useState(minTone);
    const [tempTone, setTempTone] = useState(selectedTone);

    const [isModalVisible, setModalVisible] = useState(false);

    const isFocused = useIsFocused();

    useEffect(() => {
        (async () => {
            console.log("permission check")

            fs.clear_photo()

            const currentStatus = await Camera.getCameraPermissionStatus();
            if (currentStatus === 'granted') {
                setHasPermission(true);
            } else {
                const newStatus = await Camera.requestCameraPermission();
                console.log("newStatus: " + newStatus)
                setHasPermission(newStatus === 'granted');
            }

            const Mic = require('./MicCheck').default
            Mic.checkPermission((err, result) => {
                console.log("checkPermission r: " + result)
                if (!(err)) {
                    setMicPermission(result)
                }
            })

        })();
    }, []);

    useEffect(() => {
        console.log("isFocused: " + isFocused)
        if (isFocused) {
            console.log("isFocused");
            (async () => {

                console.log("before load")
                const s = await fs.get_all_settings()
                if ("last_tone" in s) {
                    setSelectedTone(s["last_tone"])
                }
                console.log(s)
                const loadedMin = s["minTone"]
                const loadedMax = s["maxTone"]
                console.log("loaded min:" + loadedMin + " max:" + loadedMax);
                if (loadedMin != null) {
                    console.log("min " + minTone + " -> " + loadedMin);
                    setMinTone(loadedMin);
                }

                if (loadedMax != null) {
                    console.log("max " + maxTone + " -> " + loadedMax);
                    setMaxTone(loadedMax);
                }
                if ("enable_photo" in s) {
                    setEnablePhoto(s["enable_photo"])
                }
                fixSelectedTone()
            })();
        }
    }, [isFocused]);


    const tonesInRange = useMemo(() => {
        if (minTone > maxTone) return [];

        const result = [];
        for (let midi = minTone; midi <= maxTone; midi++) {
            result.push({
                midi,
                noteName: util.midiToNoteName(midi),
            });
        }
        return result;
    }, [minTone, maxTone]);

    const fixSelectedTone = () => {
        console.log("fixSelectedTone")
        if (selectedTone > maxTone) {
            setSelectedTone(maxTone)
        }
        if (selectedTone < minTone) {
            setSelectedTone(minTone)
        }
    }
    const showOverlay = () => {
        setTempTone(selectedTone);
        setModalVisible(true);
    }

    const hideOverlay = () => {
        setModalVisible(false);
    };

    const confirmTone = () => {
        fs.save_settings("last_tone", tempTone)
        setSelectedTone(tempTone);
        setModalVisible(false);
    };

    const updateRandomTone = () => {
        const tone = Math.floor(Math.random() * (maxTone - minTone + 1)) + minTone
        setSelectedTone(tone)
        fs.save_settings("last_tone", tone)
    }

    return (
        <ImageBackground source={bg} style={styles.background}>
            <View style={styles.topArea}>
                <View style={styles.toneSelectContainer}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Tone:</Text>

                    {['fixed', 'random', 'individual'].map((v) => (
                        <TouchableOpacity key={v} onPress={() => {
                            if (v === 'fixed')
                                showOverlay()
                            else if (v === 'random')
                                updateRandomTone()
                            setMode(v)
                        }} style={styles.radioRow}>
                            <View style={[styles.radioCircle, mode === v && styles.radioSelected]} />
                            <Text style={{ marginLeft: 8 }}>
                                {v === 'fixed' && 'Fixed ' + util.midiToNoteName(selectedTone)}
                                {v === 'random' && 'Random ' + util.midiToNoteName(selectedTone)}
                                {v === 'individual' && 'Individual'}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    <Modal
                        visible={isModalVisible}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={hideOverlay}
                    >
                        <View style={styles.modalBackground}>
                            <View style={styles.modalContent}>
                                <Text style={{ marginBottom: 8 }}>Select Tone:</Text>
                                <Picker
                                    selectedValue={tempTone}
                                    onValueChange={(value) => setTempTone(value)}
                                >
                                    {tonesInRange.map((tone) => (
                                        <Picker.Item key={tone.midi} label={tone.noteName} value={tone.midi} />
                                    ))}
                                </Picker>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Button title="Cancel" onPress={hideOverlay} />
                                    <Button title="Confirm" onPress={confirmTone} />
                                </View>
                            </View>
                        </View>
                    </Modal>
                </View>
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.smallButton} onPress={() => navigation.navigate('Help')}>
                        <Text style={styles.smallButtonText}>Help</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.smallButton} onPress={() => navigation.navigate('Settings')}>
                        <Text style={styles.smallButtonText}>Preferences</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.middleArea} >
            </View>
            <View style={styles.bottomArea} >
                <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => {
                        if (hasPermission && micPermission) {
                            const Mic = require('./MicCheck').default
                            db.reset()
                            Mic.startMeasure(selectedTone)
                            navigation.navigate('Measure', { order: 1, tone: selectedTone, individual: mode === 'individual', photo: enablePhoto })
                        } else {
                            Alert.alert("Not Granted", "You need to grant camera permission.")
                        }
                    }}
                >
                    <Text style={styles.startButtonText}>Start</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        resizeMode: 'cover',
    },
    topArea: {
        flexDirection: "row",
        justifyContent: 'space-between',
        paddingTop: 10,
        paddingBottom: 10,
        paddingHorizontal: 10,
        maxHeight: 160,
    },
    middleArea: {
        flex: 1,
    },
    bottomArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 30,
    },
    buttonContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    smallButton: {
        backgroundColor: '#ffffffaa',
        paddingVertical: 10,
        marginVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    smallButtonText: {
        fontSize: 16,
        color: '#000',
    },
    startButton: {
        backgroundColor: '#f4C057',
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    startButtonText: {
        color: '#333',
        fontSize: 24,
        fontWeight: 'bold',
    },
    menuContainer: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
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
    toneSelectContainer: {
        backgroundColor: '#ffffffaa',
        paddingVertical: 10,
        marginVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
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
});


export default HomeScreen;
