import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { NativeEventEmitter, NativeModules } from 'react-native';
import util from './utils';
import db from './db';
import fs from './FileAccess';

const MeasureScreen = ({ navigation, route }) => {
    const { order, tone, individual, photo } = route.params
    const device = useCameraDevice('front')
    const cameraRef = useRef(null)
    const [measuredPitch, setMeasuredPitch] = useState(0.0)

    const [selectedTone, setSelectedTone] = useState(tone)

    const isFocused = useIsFocused();

    useEffect(() => {
        if (individual) {
            (async () => {
                console.log("re-calculate target")
                const s = await fs.get_all_settings()
                let from = 55
                let to = 72

                if (
                    "minTone" in s &&
                    "maxTone" in s &&
                    typeof s["minTone"] === "number" &&
                    typeof s["maxTone"] === "number"
                ) {
                    const minTone = s["minTone"]
                    const maxTone = s["maxTone"]
                    if (
                        minTone >= 21 && minTone <= 108 &&
                        maxTone >= 21 && maxTone <= 108 &&
                        maxTone >= minTone
                    ) {
                        from = minTone
                        to = maxTone
                    }
                }

                const target = Math.floor(Math.random() * (to - from + 1)) + from
                setSelectedTone(target)
            })()
        }
    }, [isFocused]);

    console.log("order: " + order + " tone:" + tone + " indiv:" + individual)
    let before = { tone: 0, pitch: 0 }
    const emitter = new NativeEventEmitter(NativeModules.ToneEventEmitter);
    useEffect(() => {
        const sub = emitter.addListener('onMeasureUpdate', (data) => {
            if (data.pitch == before.pitch && data.tone == before.tone) {
            } else {
                console.log('Update:', data);
                before.pitch = data.pitch
                before.tone = data.tone
                setMeasuredPitch(data.pitch)
            }
        });

        return () => {
            sub.remove();
        };
    }, []);

    const confirm_measure = () => {
        const record = {
            order: order,
            targetTone: selectedTone,
            measuredPitch: measuredPitch,
        }
        db.addEntry(record)
    }

    const shoot = async (o) => {
        if (!photo) return

        try {
            if (cameraRef.current == null) {
                console.log('Camera not ready');
                return;
            }

            const photo = await cameraRef.current.takePhoto({
                flash: 'off',
            });

            console.log(`order:${o} Photo saved at: ${photo.path}`);
            db.updatePhotoPath(o, photo.path)
        } catch (e) {
            console.log(`Failed to take photo: ${e.message}`);
        }
    };

    const to_next_person = async () => {
        confirm_measure()
        shoot(order)
        navigation.replace('Measure', { order: order + 1, tone: tone, individual: individual, photo: photo })
    }


    if (device == null) {
        return <Text>Initializing the camera......</Text>
    }

    return (
        <View style={styles.container}>
            <View style={styles.cameraWrapper}>
                <Camera ref={cameraRef} style={styles.camera} device={device} isActive={true} photo={true} />
                <Text style={styles.orderText}>order: {order}</Text>
                <Text style={styles.targetText}>{"" + util.midiToNoteName(selectedTone)}</Text>
                <TouchableOpacity
                    style={styles.nextButton}
                    onPress={() => {
                        to_next_person()
                    }}
                >
                    <Text style={styles.nextButtonText}>Measure</Text>
                </TouchableOpacity>

            </View>
            <View style={styles.buttons}>
                <Button
                    title="Finish"
                    onPress={() => {
                        const Mic = require('./MicCheck').default
                        Mic.stopMeasure()
                        navigation.navigate('Result', { order: order + 1, tone: tone, individual: individual, photo: photo })
                    }}
                />
            </View>
        </View>
    );
};

export default MeasureScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    orderText: {
        position: 'absolute',
        top: 10,
        left: 10,
        fontSize: 18,
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        overflow: 'hidden',
    },
    targetText: {
        position: 'absolute',
        top: 60,
        fontSize: 64,
        color: 'white',
        backgroundColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        overflow: 'hidden',
    },
    cameraWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    camera: {
        ...StyleSheet.absoluteFillObject,
    },
    nextButton: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButtonText: {
        color: 'black',
        fontSize: 20,
        fontWeight: 'bold',
    },
    buttons: {
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
});
