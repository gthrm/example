import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  StatusBar,
  Alert,
  KeyboardAvoidingView
} from 'react-native';

import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import * as Calendar from 'expo-calendar';
import * as Permissions from 'expo-permissions';

import styled from 'styled-components/native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { sourceIdForCalendar, getPath } from '../constants/Layout';

import actions from '../store/actions';
import api from '../api';
import Colors from '../constants/Colors';
import { _errorHandler } from '../etc/_errorHandler';
import { _retrieveData } from '../etc/AsyncStorageManipulator';
import Label from '../components/Label';
import EventWindow from '../components/EventWindow';

const { height } = Dimensions.get('window');
const paddingTop = Constants.statusBarHeight + 200;

const TabPickerContainer = styled.View`
    justify-content: center;
    align-items: center;
    padding: 5px;
`;

const TabPicker = styled.View`
    width: 40px;
    height: 2px;
    background: ${Colors.tabPicker}
`;

class BookingScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: null,
    headerTransparent: true,
    headerStyle: {
      opacity: (!navigation.state.params ? 0 : navigation.state.params.opacityValue)
    },
    headerTintColor: Colors.chipTextSelected,
  });

  static getDerivedStateFromProps(props, state) {
    if (state.event) {
      const { lectures } = state.event;
      if (lectures) {
        const papers = lectures.flatMap(
          (lecture) => (lecture.papers ? lecture.papers : null)
        );
        return {
          papers
        };
      }
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      event: undefined,
      isEventReady: false,
      papers: undefined,
      // firstScrollToEnd: false
    };
    this._animatedValue = new Animated.Value(0);
    props.navigation.setParams({
      animatedValue: this._animatedValue.interpolate({
        inputRange: [0, 80],
        outputRange: [80, -80],
        extrapolate: 'clamp'
      }),
      opacityValue: this._animatedValue.interpolate({
        inputRange: [0, 80],
        outputRange: [1, 0],
        extrapolate: 'clamp'
      })
    });
    this.scrollView;
    this.pollId;
  }

  componentDidMount() {
    const { navigation } = this.props;
    this._navListener = navigation.addListener('didFocus', () => {
      StatusBar.setBarStyle('light-content');
    });
  }

  componentWillUnmount() {
    this._navListener.remove();
  }

  onPressToLectureItem = (id) => {
    const { navigation } = this.props;
    // console.log('onPressToLectureItem', id);
    navigation.navigate('Lecture', { subEventId: id });
  }

  onPressToSendComment = (text) => {
    // console.log('onPressToSendComment: ', text);
    this._apiOnPressToSendComment(text);
  }

  getEventsCalendars = () => Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)

  onPressToPaper = (path) => {
    const pathUrl = getPath(path);
    console.log(pathUrl);
    WebBrowser.openBrowserAsync(pathUrl);
  }

  onPressToDownload = (path) => {
    const pathUrl = getPath(path);
    Linking.canOpenURL(pathUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(pathUrl);
        }
        return null;
      })
      .catch((err) => console.error('An error occurred', err));
  }

  onPressToVotingMark = (id) => {
    // console.log('onPressToSendComment: ', id);
    this.pollId = id;
    this._apiOnPressToVotingMark();
  }

  onPressToVoting = (id) => {
    this.getVoting(id);
  }

  getVoting = (id) => {
    this.votingId = id;
    this._apiGetVoting();
  }

  _apiGetVoting = async () => {
    const { navigation } = this.props;
    const accessToken = await _retrieveData('access_token');
    api.getVoting(accessToken, this.votingId)
      .then(
        ({ data }) => {
          console.log('getVoting', data);
          navigation.navigate('VotingNotification', { voting: data });
        }
      )
      .catch(
        (err) => {
          _errorHandler(err, this._apiGetVoting.bind(this));
        }
      );
  }

  _apiOnPressToVotingMark = async () => {
    const pollFavourite = {
      poll: this.pollId
    };
    const accessToken = await _retrieveData('access_token');

    api.addPollToFavourite(accessToken, pollFavourite)
      .then(
        ({ data }) => {
          this.setState((prevState) => ({ event: { ...prevState.event, polls: data.polls } }));
        }
      )
      .catch(
        (err) => {
          _errorHandler(err, this._apiOnPressToVotingMark.bind(this));
        }
      );
  }

  _getCalendarEventIcs = async () => {
    const { event } = this.state;
    const accessToken = await _retrieveData('access_token');
    api.getCalendarEventIcs(accessToken, event.id)
      .then(
        ({ data }) => {
          console.log('getCalendarEventIcs', data);
          const ics = getPath(data.path);
          WebBrowser.openBrowserAsync(ics);
        }
      )
      .catch(
        (err) => console.log(err, err.response)
      );
  }

  createCalendar = async () => {
    const { status } = await Permissions.askAsync(Permissions.CALENDAR);
    console.log(status);
    const iOsCalendarConfig = {
      title: sourceIdForCalendar,
      color: Colors.tintColor,
      entityType: Calendar.EntityTypes.EVENT,
    };

    if (status === 'granted') {
      switch (Platform.OS) {
        case 'ios': {
          const calendars = await this.getEventsCalendars();
          const calendarIsDetected = calendars.find(
            (calendar) => calendar.title === sourceIdForCalendar
          );
          if (calendarIsDetected) {
            return calendarIsDetected.id;
          }
          const typeIsOk = (calendar) => calendar.source.type === Calendar.CalendarType.LOCAL
            || calendar.source.type === Calendar.CalendarType.CALDAV;
          const calendarFoExample = calendars.find(
            (calendar) => typeIsOk(calendar) && calendar.source.entityType === 'event'
          );
          const check = calendarFoExample.source ? calendarFoExample.source.id : undefined;
          iOsCalendarConfig.sourceId = calendarFoExample ? check : calendars[0].source.id;
          return Calendar.createCalendarAsync(iOsCalendarConfig);
        }
        case 'android':

          break;
        default:
      }
    }
    return null;
  }

  creacteEvent = (calendarId, details) => Calendar.createEventAsync(calendarId, details)

  addEventToCalendar = async () => {
    const { event } = this.state;
    const details = {
      title: event.title,
      startDate: new Date(event.date),
      endDate: new Date(new Date(event.date).setHours(new Date(event.date).getHours() + 2)),
      allDay: false,
      location: '',
      notes: event.description,
      timeZone: 'GMT+3'
    };
    // console.log('addEventToCalendar', details);
    const { status } = await Permissions.askAsync(Permissions.CALENDAR);
    // console.log(status);
    if (status === 'granted') {
      await Calendar.requestRemindersPermissionsAsync()
        .then(
          async () => {
            await this.createCalendar()
              .then(
                async (calendarId) => {
                  const response = await Permissions.askAsync(Permissions.CALENDAR);
                  const granted = response.status === 'granted';
                  // console.log('calendarId', calendarId, details, 'granted', granted);
                  if (granted) {
                    this.creacteEvent(calendarId, details)
                      .then(
                        (res) => {
                          this._saveEventToCalendarHandler('success');
                          console.log('creacteEvent success', res);
                        }
                      )
                      .catch(
                        (err) => {
                          this._saveEventToCalendarHandler('err', err);
                          console.log('creacteEvent failure', err);
                        }
                      );
                  }
                }
              )
              .catch(
                (err) => {
                  console.log('createCalendar failure', err);
                }
              );
          }
        );
    }
  }

  _saveEventToCalendarHandler = (success, err) => {
    let message;
    if (success === 'success') {
      message = {
        title: 'Успех!',
        text: 'Событие добавлено'
      };
    }
    if (err) {
      message = {
        title: 'Ошибка',
        text: 'У нас нет прав на доступ к вашей учетной записи в календаре'
      };
    }
    Alert.alert(
      message.title,
      message.text,

      [
        { text: 'Ok', onPress: () => console.log('Ok') }
      ],
      { cancelable: true }
    );
  }

  _saveEventToCalendar = async () => {
    Alert.alert(
      'В календарь',
      'Хотите сохранить событие в календарь?',

      [
        { text: 'Да', onPress: this.addEventToCalendar.bind(this) },
        {
          text: 'Отмена',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        }
      ],
      { cancelable: true }
    );
  }

  changeFilter = (id) => {
    const { chips } = this.state;
    const newChips = chips;
    const indexChip = newChips.findIndex(
      (item) => item.id === id
    );
    newChips[indexChip].selected = !newChips[indexChip].selected;
    this.setState((prevState) => ({
      ...prevState,
      chips: prevState.chips.map((item) => (item.id === id
        ? { ...item, selected: !item.selected }
        : { ...item }
      ))
    }));
  }

  openEventHandler = (id) => {
    console.log('openEventHandler, onPress to card, id:', id);
  }

  _apiOnPressToSendComment = async (text) => {
    const { event } = this.state;
    const accessToken = await _retrieveData('access_token');

    const commentsData = {
      event: event.id,
      text
    };
    console.log('commentsData', commentsData);

    api.postComment(accessToken, commentsData)
      .then(
        ({ data }) => {
          console.log('_apiOnPressToSendComment', data);
          this.setState((prevState) => ({ event: { ...prevState.event, comments: data } }));
        }
      )
      .catch(
        (err) => _errorHandler(err, this._apiOnPressToSendComment.bind(this, text))
      );
  }

  subscribeHandler = (event) => {
    const { navigation } = this.props;
    navigation.state.params.subscribeHandler(event, this._getEvent);
  }

  _getEvent = async () => {
    const { navigation: { state } } = this.props;
    const accessToken = await _retrieveData('access_token');
    api.getEvents(accessToken, `id=${state.params.eventId}`)
      .then(
        ({ data }) => {
          console.log('_getEvent: ', data);
          this.setState({ event: data });
        }
      )
      .catch(
        (err) => _errorHandler(err, this._getEvent.bind(this))
      )
      .finally(
        () => {
          this.setState({ isEventReady: true });
        }
      );
  }

  render() {
    const { event, papers, isEventReady } = this.state;
    if (!isEventReady) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors.background
          }}
          onLayout={this._getEvent}
        >
          <ActivityIndicator size="large" color={Colors.tintColor} />
        </View>
      );
    }
    return (
      <KeyboardAvoidingView behavior="position" style={{ flex: 1 }} enabled>
        {event
          ? (
            <View style={[styles.container, styles.viewContainer]}>
              <StatusBar barStyle="light-content" />
              <Label
                name={event.title}
                date={event.date}
                heightToStyle={paddingTop}
              />
              <ScrollView
                ref={(ref) => { this.scrollView = ref; }}
                onContentSizeChange={this.scrollToEnd}
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                bounces={false}
                onScroll={Animated.event([
                  { nativeEvent: { contentOffset: { y: this._animatedValue } } }
                ])}
                scrollEventThrottle={16}
              >
                <View
                  style={styles.containerInfo}
                >
                  <View style={{ flex: 1 }}>
                    <TabPickerContainer>
                      <TabPicker />
                    </TabPickerContainer>
                    <EventWindow
                      id={event.id}
                      title={event.title}
                      description={event.description}
                      subscribed={event.subscribed}
                      tags={event.tags}
                      comments={event.comments}
                      viewed={event.viewed}
                      subscribers_counter={event.subscribers_counter}
                      date={event.date}
                      place={event.place}
                      lectures={event.lectures}
                      eventId={event.eventId}
                      votings={event.polls}
                      subscribeHandler={this.subscribeHandler}
                      addEventToCalendar={this._getCalendarEventIcs}
                      onPressToSendComment={this.onPressToSendComment}
                      papers={papers}
                      onPressToDownload={this.onPressToDownload}
                      onPressToPaper={this.onPressToPaper}
                      onPressToVotingMark={this.onPressToVotingMark}
                      onPressToVoting={this.onPressToVoting}
                      onPressToLectureItem={this.onPressToLectureItem}
                    />

                  </View>
                </View>
              </ScrollView>
            </View>
          )
          : null}
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentContainer: {
    paddingTop,

  },
  containerInfo: {
    flex: 1,
    minHeight: height,
    backgroundColor: Colors.backgroundEventCard,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingBottom: 60,
    paddingTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOffset: { height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 15
      },
      android: {
        elevation: 20
      }
    })
  },
  viewContainer: {
    minHeight: height,
    backgroundColor: Colors.eventBackground2
  }
});

const mapStateToProps = (state) => ({
  eventData: state.eventData
});

const mapDispatchToProps = (dispatch) => ({
  changeEventData: bindActionCreators(actions.changeEventData, dispatch)
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(BookingScreen);
