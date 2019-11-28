import * as React from 'react';
import {
  View
} from 'react-native';

import { Chip } from 'react-native-paper';
import Colors from '../constants/Colors';

const Chips = (props) => {
  const {
    selected = false,
    selectedColor = Colors.selectedChipColor,
    onPress = () => console.log('Pressed'),
    icon,
    onClose,
    title
  } = props;
  return (
    <View style={{ padding: 5 }}>
      <Chip
        textStyle={{
          color: selected ? Colors.chipTextSelected : Colors.chipText,
          fontSize: 14,
          fontFamily: 'sf-ui-display-semibold'
        }}
        style={{
          backgroundColor: selected ? Colors.selectedChipColor : Colors.chipColor,

        }}
        onClose={onClose}
        selected={selected}
        icon={icon}
        selectedColor={selected ? '#fff' : selectedColor}
        onPress={onPress}
        iconColorPrimary={{
          color: '#fff'
        }}
      >
        {title}
      </Chip>
    </View>
  );
};

export default Chips;
