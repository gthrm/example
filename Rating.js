import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { createContactsArray } from '../constants/Layout';
import Colors from '../constants/Colors';

const Rating = (props) => {
  const {
    name = 'star',
    name2 = 'star-o',
    size = 20,
    stars = 5,
    rating: selected,
    onPress = (value) => console.log(value),
    disabled = true
  } = props;
  const data = createContactsArray(['id', 'selected'], ['', false], stars, selected);
  return (
    <View style={{ flexDirection: 'row', paddingLeft: 10, alignItems: 'flex-end' }}>
      {data.map(
        (item, index) => (
          <TouchableOpacity
            disabled={disabled}
            style={{ padding: 3 }}
            activeOpacity={0.5}
            key={item.id}
            onPress={() => onPress(index + 1)}
          >
            <FontAwesome
              name={item.selected ? name : name2}
              size={size}
              style={{ marginBottom: 0 }}
              color={Colors.stars}
            />
          </TouchableOpacity>
        )
      )}
    </View>
  );
};

export default Rating;
