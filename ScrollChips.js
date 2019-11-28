import React from 'react';
import {
  ScrollView,
  LayoutAnimation
} from 'react-native';

import Chips from './Chips';

export default class ScrollChips extends React.Component {
  onPress = (value) => {
    const { onPress: onPressProp } = this.props;
    LayoutAnimation.configureNext({
      duration: 700, create: { type: 'linear', property: 'opacity' }, update: { type: 'spring', springDamping: 0.4 }, delete: { type: 'linear', property: 'opacity' }
    });
    onPressProp(value);
  }

  render() {
    const { data = [] } = this.props;
    return (
      <ScrollView horizontal style={{ flexDirection: 'row' }} contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 10 }}>
        {data.map(
          (item) => (
            <Chips
              selected={item.selected}
              title={item.title}
              key={item.id}
              onPress={() => this.onPress(item.id)}
            />
          )
        )}
      </ScrollView>
    );
  }
}
