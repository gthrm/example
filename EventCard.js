import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  UIManager,
  ActivityIndicator
} from 'react-native';
import Colors from '../constants/Colors';
import SubscribeCounter from './SubscribeCounter';
import ViewCounter from './ViewCounter';
import TimeBox from './TimeBox';
import PlaceBox from './PlaceBox';
import GreatestButton from './GreatestButton';

import { getFontScale } from '../constants/Layout';

if (
  Platform.OS === 'android'
  && UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EventCard = (props) => {
  const {
    cardData,
    subscribeHandler = () => console.log('onPress to subscribe, card id:', props.id),
    openEventHandler
  } = props;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={openEventHandler}
      style={styles.container}
    >
      <View style={styles.leftPart}>
        <View style={styles.timePlaceContainer}>
          <TimeBox date={cardData.date} />
          <PlaceBox placeId={cardData?.place?.id} place={cardData?.place?.title} />
        </View>
        <View style={{ paddingTop: 10 }}>
          <GreatestButton
            text={cardData.subscribed ? 'Пойду' : 'Интересует'}
            isPressed={cardData.subscribed}
            onPress={subscribeHandler}
            eventId={cardData.id}
          />
        </View>
      </View>
      <View style={styles.rightPart}>
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={{
            fontSize: getFontScale(16),
            fontFamily: 'sf-ui-display-semibold'
          }}
        >
          {cardData.title}
        </Text>
        <Text
          numberOfLines={3}
          ellipsizeMode="tail"
          style={{
            paddingTop: 10,
            fontSize: 14,
            fontFamily: 'sf-ui-display-light'
          }}
        >
          {cardData.description}
        </Text>
        <View style={{
          flex: 1, flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: 6
        }}
        >
          <SubscribeCounter subscribeCounter={cardData.subscribers_counter} />
          <ViewCounter viewCounter={cardData.viewed} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 5,
    flex: 1,
    marginBottom: 20,
    flexDirection: 'row',
    backgroundColor: Colors.backgroundEventCard,
    paddingLeft: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: Colors.eventCardsShadow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  leftPart: {
    flex: 0.3
  },
  rightPart: {
    paddingLeft: 15,
    flex: 0.7
  },
  timePlaceContainer: {
    paddingLeft: 10,
    borderRightColor: Colors.borderLeftColor,
    borderRightWidth: 3
  }
});

export default EventCard;
