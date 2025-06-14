/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import HomeScreen from "./Home"
import MeasureScreen from './Measure';
import LicensesScreen from './Licenses';
import HelpScreen from './Help';
import ResultScreen from './Result';
import SettingsScreen from './Settings';


const Stack = createNativeStackNavigator();
function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Measure" component={MeasureScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="Licenses" component={LicensesScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
