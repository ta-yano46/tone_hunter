import React, { useEffect, useState } from 'react';
import { Button } from 'react-native';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * Delay button component
 *
 * @param onPress Processing when the button is pressed after it has been enabled
 * @param delay Number of seconds until the button can be pressed (default 10 seconds)
 */
const DelayButton = ({ onPress, delay = 10 }) => {
  const [count, setCount] = useState(delay);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(false);
    setCount(delay);

    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setEnabled(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [delay]);

  return (
    <TouchableOpacity
      onPress={enabled ? onPress : null}
      style={[styles.button, !enabled && styles.buttonDisabled]}
      activeOpacity={enabled ? 0.7 : 1}
    >
      <Text style={[styles.buttonText, !enabled && styles.buttonTextDisabled]}>
        {enabled ? 'Next Game' : `Wait ${count}s`}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonTextDisabled: {
    color: '#666',
  },
});
export default DelayButton;