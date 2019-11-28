import React from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
  Easing
} from 'react-native';

import Colors from '../constants/Colors';
import TabBarIcon from './TabBarIcon';

const ScreenTitle = (props) => {
  const {
    rightButton,
    title = 'Заголовок',
    icon = false,
    onIconPress = () => console.log('onIconPress'),
    onPressBack = () => console.log('onPressBack'),
    focused = false,
    type,
    onRightButtonPress = () => console.log('onRightButtonPress'),
    style,
    rightButtonIcon = 'plus-circle',
    searchBarIsVisible = false,
    backButtonIcon = 'chevron-left',
    backTitle = 'Назад',
    backButton = false
  } = props;
  return (
    <View
      style={[{ ...style }, { alignItems: 'flex-start', justifyContent: 'space-between' }]}
      activeOpacity={0.8}
    >
      <TouchableOpacity
        disabled={!backButton}
        onPress={onPressBack}
        style={{
          flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingLeft: 10, opacity: backButton ? 1 : 0
        }}
      >
        <RenderIcon
          disabled={!backButton}
          nameIcon={backButtonIcon}
          onIconPress={onPressBack}
          focused
          styleContainer={{ flex: 0 }}
        />
        <Text style={{
          fontSize: 16,
          fontFamily: 'sf-ui-display-medium'
        }}
        >
          {backTitle}

        </Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={onIconPress}
          style={{
            flex: 1, paddingLeft: type === 2 ? 0 : 25, paddingTop: type === 2 ? 0 : 20, flexDirection: 'row', alignItems: 'center'
          }}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: type === 2 ? 18 : 25,
              fontFamily: 'sf-ui-display-semibold'
            }}
          >
            {title}

          </Text>
          {icon
            ? (
              <RenderIcon
                onIconPress={onIconPress}
                focused={focused}
                styleContainer={{ flex: 0 }}
              />
            )
            : null}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRightButtonPress}
          style={{
            flex: 0.2,
            paddingLeft: type === 2 ? 0 : 25,
            paddingTop: type === 2 ? 0 : 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 10
          }}
        >
          {rightButton
            ? (
              <RenderIcon
                onIconPress={onRightButtonPress}
                nameIcon={rightButtonIcon}
                focused={searchBarIsVisible}
              />
            )
            : null}
        </TouchableOpacity>
      </View>
    </View>
  );
};

class RenderIcon extends React.Component {
  constructor(props) {
    super(props);
    this.position = new Animated.Value(0);
    this.rotate = this.position.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '90deg'],
      extrapolate: 'clamp'
    });
    this.rotateAndTranslate = {
      transform: [{
        rotate: this.rotate
      }]
    };
  }

  componentDidUpdate(prevProps) {
    const { focused } = this.props;
    if (prevProps.focused !== focused) {
      Animated.timing(
        this.position,
        {
          toValue: focused ? 1 : 0,
          duration: 100,
          easing: Easing.linear
        }
      ).start();
    }
  }

  render() {
    const {
      onIconPress = () => console.log('onIconPress'),
      nameIcon = 'chevron-right',
      style,
      styleContainer,
      size = 20,
      disabled
    } = this.props;
    return (
      <Animated.View style={[this.rotateAndTranslate, { ...styleContainer }]}>
        <TouchableOpacity
          disabled={disabled}
          style={[{ ...style }, { paddingHorizontal: 5, alignItems: 'flex-end', justifyContent: 'flex-end' }]}
          onPress={onIconPress}
        >
          <TabBarIcon
            tintColor={Colors.textColor}
            size={size}
            focused
            name={nameIcon}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  }
}

export default ScreenTitle;
