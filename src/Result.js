import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import util from './utils';
import fs from './FileAccess';
import db from './db';
import DelayButton from './DelayButton';

const ResultScreen = ({ navigation }) => {
    const [num, setNum] = useState(7);
    const [loading, setLoading] = useState(true);
    const dummyPhoto = require('../assets/pierrot.png');

    useEffect(() => {
        async function loadNum() {
            const loadedNum = await fs.load_settings("result_people");
            if (isNaN(loadedNum)) {
                setNum(7);
            } else {
                setNum(loadedNum);
            }
            setLoading(false);
        }
        loadNum();
    }, []);

    if (loading) {
        return <Text>Loading...</Text>;
    }

    const results = db.getAll().map((entry) => {
        const targetHz = util.midiToFrequency(entry.targetTone);
        const diff = Math.abs(entry.measuredPitch - targetHz);
        const diffCent = util.calcDiffCent(entry.measuredPitch, targetHz);
        return { ...entry, diff, diffCent };
    }).sort((a, b) => a.diffCent - b.diffCent);

    const limitedResults = results.slice(0, num);
    const first = limitedResults[0];
    const secondThird = limitedResults.slice(1, 3);
    const others = limitedResults.slice(3);

    return (
        <>
            <Text> Result</Text>
            <View style={styles.container}>
                {first && (
                    <View style={styles.firstPlace}>
                        <Text style={styles.rankText}>{"🥇 1st (" + first.order + ")"}</Text>
                        <Text>{util.midiToNoteName(first.targetTone)} → {util.midiToNoteName(util.frequencyToMidiNote(first.measuredPitch))}</Text>
                        <Text>{`cent: ${first.diffCent.toFixed(2)}`}</Text>
                        {first.photoPath ? (
                            <Image source={{ uri: first.photoPath }} style={styles.firstPhoto} />
                        ) :
                            <Image source={dummyPhoto} style={styles.firstPhoto} />
                        }
                    </View>
                )}

                {secondThird.length > 0 && (
                    <View style={styles.secondThirdContainer}>
                        {secondThird.map((v, i) => (
                            <View key={v.order} style={styles.secondThirdItem}>
                                <Text style={styles.rankText}>
                                    {(i === 0 ? '🥈 2nd' : '🥉 3rd') + " (" + v.order + ")"}
                                </Text>
                                {v.photoPath ? (
                                    <Image source={{ uri: v.photoPath }} style={styles.mediumPhoto} />
                                ) : (
                                    <Image source={dummyPhoto} style={styles.mediumPhoto} />
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {others.length > 0 && (
                    <View style={styles.othersContainer}>
                        {others.map((v, i) => (
                            <View key={v.order} style={styles.otherItem}>
                                <Text>{`${i + 4}th: (${v.order})`}</Text>
                                {
                                    v.photoPath ? (
                                        <Image source={{ uri: v.photoPath }} style={styles.otherPhoto} />
                                    ) : (<Image source={dummyPhoto } style={styles.otherPhoto} />)
                                }
                            </View>
                        ))}
                    </View>
                )}
            </View>
            <DelayButton onPress={() => navigation.navigate('Home')} />
        </>
    );
};

const styles = StyleSheet.create({
    photo: {
        width: 100,
        height: 100,
    },
    container: {
        alignItems: 'center',
    },
    firstPlace: {
        marginVertical: 20,
        alignItems: 'center',
    },
    firstPhoto: {
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    secondThirdContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginVertical: 10,
    },
    secondThirdItem: {
        alignItems: 'center',
    },
    mediumPhoto: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    othersContainer: {
        flexDirection: 'row',
        marginTop: 20,
        width: '90%',
    },
    otherItem: {
        marginVertical: 4,
    },
    otherPhoto: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    rankText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
})

export default ResultScreen
