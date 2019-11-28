import React from 'react';
import {
  ActivityIndicator,
  View,
  Animated,
  FlatList
} from 'react-native';
import Constants from 'expo-constants';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import actions from '../store/actions';
import Colors from '../constants/Colors';
import api from '../api';
import { _retrieveData } from '../etc/AsyncStorageManipulator';
import { _errorHandler } from '../etc/_errorHandler';
import MyBookingItem from '../components/MyBookingItem';
import ScrollChips from '../components/ScrollChips';

const moment = require('moment-timezone');

const toDay = moment().set('minute', 0).set('hour', 0).format();
// eslint-disable-next-line newline-per-chained-call
const afterTomorrow = moment().set('minute', 59).set('hour', 23).add(1, 'd').format();

class MyBookingScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: null,
    headerTransparent: true,
    headerStyle: {
      opacity: (!navigation.state.params ? 0 : navigation.state.params.opacityValue)
    },
    headerTintColor: Colors.tintColor,
  });

  static getDerivedStateFromProps(props, state) {
    if (state.data && !state.isMyBooksReady) {
      return { isMyBooksReady: true };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      responsIsReceived: true,
      showLoading: false,
      search: '',
      data: undefined,
      isMyBooksReady: false,
      isOnLayout: false,
      searchBarIsVisible: false,
      chips: [
        {
          id: '0001',
          title: 'Активные',
          selected: true,
          filterString: ''
        },
        {
          id: '0002',
          title: 'Предстоящие ',
          selected: false,
          filterString: 'gte'
        },
        {
          id: '0003',
          title: 'Прошедшие',
          selected: false,
          filterString: 'lt'
        }
      ],

    };

    this._animatedHeaderValue = new Animated.Value(0);
    props.navigation.setParams({
      animatedValue: this._animatedHeaderValue.interpolate({
        inputRange: [0, 80],
        outputRange: [80, -80],
        extrapolate: 'clamp'
      }),
      opacityValue: this._animatedHeaderValue.interpolate({
        inputRange: [0, 80],
        outputRange: [1, 0],
        extrapolate: 'clamp'
      })
    });
    this._animatedHeaderValueInterpolate = this._animatedHeaderValue.interpolate({
      inputRange: [0, 150],
      outputRange: [0, -300],
      extrapolate: 'clamp'
    });
    this.startCount = 1;
    this.count;
    this.limit;
    this.filter = '';
  }

  componentDidMount() {
    const { navigation } = this.props;
    this.focusListener = navigation.addListener('didFocus', () => {
      this._getMyBooksFromServer(true);
    });
  }

  componentWillUnmount() {
    this.focusListener.remove();
  }

  openEventHandler = (id) => {
    console.log('openEventHandler', id);
  }

  _getMyBooksFromServer = async (firstFocus) => {
    const { isOnLayout, responsIsReceived } = this.state;
    const { getInitialState } = this.props;
    // console.table([
    //   ['this.count: ', this.count],
    //   ['this.startCount: ', this.startCount],
    //   ['this.count >= this.startCount: ', this.count >= this.startCount],
    //   ['responsIsReceived: ', responsIsReceived],
    //   ['this.limit', this.limit]
    // ])
    const countCheck = !this.count || this.count >= this.startCount;
    if (countCheck && responsIsReceived) {
      this.setState({ responsIsReceived: false });
      const accessToken = await _retrieveData('access_token');
      api.getMyBooks(accessToken, this.startCount, this.filter)
        .then(
          ({ data }) => {
            this.setState({ responsIsReceived: true });
            this.count = data.count;
            this.limit = data.limit;
            let newDate = data;
            if (this.filter === '') {
              const activeDate = data.results.filter(
                (item) => this.getIsAvailable(item.date_from, item.date_to)
              );
              console.log('activeDate', activeDate);
              newDate = Array.isArray(data.results) ? { results: activeDate } : { results: [] };
            }
            this.setState((prevState) => ({
              data: {
                ...prevState.data,
                results: prevState.data && !firstFocus
                  ? [...prevState.data.results, ...newDate.results]
                  : newDate.results
              }
            }));
            if (!isOnLayout) {
              this.setState({ isOnLayout: !isOnLayout });
            }
          }
        )
        .catch(
          (err) => {
            _errorHandler(err, this._getMyBooksFromServer.bind(this), getInitialState);
          }
        );
    }
  }

  _onEndReached = () => {
    if (this.count && this.limit) {
      this.startCount += this.limit;
    }
    this._getMyBooksFromServer();
  }

  getIsAvailable = (dateFrom, dateTo) => {
    const isOver = moment(dateTo).isBefore(moment(), 'minutes');
    const check = moment(dateFrom).isSameOrBefore(afterTomorrow, 'minutes') && moment(dateFrom).isSameOrAfter(toDay, 'minutes') && !isOver;
    console.table([['dateFrom', dateFrom], ['dateTo', dateTo], ['toDay', toDay], ['afterTomorrow', afterTomorrow], ['check', check], ['isOver', isOver]]);
    return check;
  }

  getIsOver = (dateTo) => moment(dateTo).isBefore(moment(), 'minutes')

  changeFilter = (id) => {
    const { chips } = this.state;
    this.setState((prevState) => ({
      ...prevState,
      chips: prevState.chips.map(
        (item) => (item.id === id
          ? { ...item, selected: true }
          : { ...item, selected: false })
      )
    }));
    this.startCount = 1;
    this.filter = chips.find((item) => id === item.id).filterString;
    this.setState({ data: { results: [] } });
    this._getMyBooksFromServer();
  }

  pressToAvailable = (book) => {
    const { navigation } = this.props;
    navigation.navigate('BookingConfirm', { book });
  }

  pressToOver = (book) => {
    const { navigation } = this.props;
    navigation.navigate('BookingReview', { book });
  }

  onPressToBookingItem = (bookingId) => {
    console.log('bookingId', bookingId);
    const { data } = this.state;
    const { navigation } = this.props;
    const book = data.results.find((item) => (item.id === bookingId));
    const isOver = this.getIsOver(book.date_to);
    const screenString = isOver ? 'BookingReview' : 'BookingConfirm';
    navigation.navigate(screenString, { book });
  }

  render() {
    const {
      data: { results = [] } = { results: [], next: undefined },
      isMyBooksReady,
      isOnLayout,
      chips
    } = this.state;
    if (!isMyBooksReady && !isOnLayout) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors.background
          }}
          onLayout={() => this._getMyBooksFromServer()}
        >
          <ActivityIndicator size="large" color={Colors.tintColor} />
        </View>
      );
    }
    return (
      <View
        style={[{
          flex: 1,
          backgroundColor: Colors.background,
          // paddingTop: Constants.statusBarHeight + 35,
          // paddingBottom: 20
        }]}
        ref={(ref) => { this.scrollView = ref; }}

      >
        <FlatList
          onScroll={Animated.event([
            { nativeEvent: { contentOffset: { y: this._animatedHeaderValue } } }
          ])}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: Constants.statusBarHeight + 110,
          }}
          onEndReached={this._onEndReached}
          onEndReachedThreshold={0.5}
          data={results}
          renderItem={({ item }) => (
            <MyBookingItem
              onPressToBookingItem={this.onPressToBookingItem}
              pressToAvailable={this.pressToAvailable}
              pressToOver={this.pressToOver}
              isAvailable={this.getIsAvailable(item.date_from, item.date_to)}
              isOver={this.getIsOver(item.date_to)}
              key={item.id}
              book={item}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
        />
        <Animated.View
          style={{
            top: this._animatedHeaderValueInterpolate,
            paddingTop: Constants.statusBarHeight + 40,
            position: 'absolute'
          }}
        >
          <View>
            <ScrollChips data={chips} onPress={this.changeFilter} />
          </View>
        </Animated.View>
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  screenThatYouSee: state.screenThatYouSee
});

const mapDispatchToProps = (dispatch) => ({
  changeScreenThatYouSee: bindActionCreators(actions.changeScreenThatYouSee, dispatch),
  getInitialState: bindActionCreators(actions.getInitialState, dispatch)
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MyBookingScreen);
