import React from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  View,
  Easing,
  FlatList,
  Platform,
  StatusBar,
  LayoutAnimation,
  ScrollView
} from 'react-native';

import Constants from 'expo-constants';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import actions from '../store/actions';
import constants, { debounce } from '../constants/Layout';
import api from '../api';
import Colors from '../constants/Colors';
import { _errorHandler } from '../etc/_errorHandler';
import { _retrieveData } from '../etc/AsyncStorageManipulator';
import BuildingCard from '../components/BuildingCard';
import FloorCard from '../components/FloorRoomCard';
import TableCard from '../components/TableCard';
import Header from '../components/Header';
import BookingModal from '../components/BookingModal';
import { getAlert } from '../etc/erorAlert';

const moment = require('moment-timezone');

class BookingScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    header: null,
    title: null,
    headerTransparent: true,
    headerStyle: {
      opacity: (!navigation.state.params ? 0 : navigation.state.params.opacityValue)
    },
    headerTintColor: Colors.chipTextSelected,
  });

  constructor(props) {
    super(props);
    this.state = {
      search: '',
      isBookingReady: undefined,
      bookingTypes: [],
      chips: [],
      isOnLayout: false,
      screenIsOpen: false,
      screenTitle: 'Рабочее место',
      screenName: 'table',
      offices: [],
      floors: [],
      rooms: [],
      tables: [],
      officeIndex: 0,
      searchBarIsVisible: false,
      firstGetFloorsIsLoad: false,
      listCount: 0,
      dateTimePickerIsVisible: false,
      selectedPickerValue: 1,
      pickerData: [{
        label: '1 час',
        value: 1
      },
      {
        label: '2 часа',
        value: 2
      },
      {
        label: '3 часа',
        value: 3
      },
      {
        label: '4 часа',
        value: 4
      },
      {
        label: '5 часов',
        value: 5
      },
      {
        label: '6 часов',
        value: 6
      },
      {
        label: '7 часов',
        value: 7
      },
      {
        label: '8 часов',
        value: 8
      }],
      selectedStartDate: new Date().setMinutes(0),
      selectedEndDate: new Date(moment().add(1, 'hours')).setMinutes(0),
      time: new Date()
    };
    this.spinValue = new Animated.Value(1);
    this.spinIntepolate = this.spinValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, constants.window.width / 2]
    });
    this._animatedHeaderValue = new Animated.Value(0);
    this._animatedHeaderValueInterpolate = this._animatedHeaderValue.interpolate({
      inputRange: [0, 150],
      outputRange: [0, -200],
      extrapolate: 'clamp'
    });
    this.filterString = '';
    this.startCount = 1;
    this.count;
    this.limit;
    this.horizontalScrollView;
    this.horizontalScrollViewParams;
    this.animatedFlatList1;
    this.animatedFlatList2;
    this.animatedFlatList3;
    this.animatedFlatList4;

    this.officesId;
    this.floorId;
    this.roomId;
  }

  componentDidMount() {
    const { navigation, changeScreenThatYouSee } = this.props;
    this.focusListener = navigation.addListener('didFocus', () => {
      StatusBar.setBarStyle('dark-content');
      changeScreenThatYouSee(navigation.state.routeName);
    });
  }

  shouldComponentUpdate(nextProps) {
    const { screenThatYouSee } = this.props;
    if (nextProps.screenThatYouSee === 'Booking' && screenThatYouSee === 'Home') {
      this.spinIntepolate = this.spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: [constants.window.width / 2, 0]
      });
      this.spin();
    } else if (nextProps.screenThatYouSee === 'Booking' && screenThatYouSee === 'User') {
      this.spinIntepolate = this.spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-constants.window.width / 2, 0]
      });
      this.spin();
    }
    return true;
  }

  componentDidUpdate(prevProps, prevState) {
    const { listCount } = this.state;
    if (prevState.listCount !== listCount) {
      this.horizontalScrollViewScrollTo(listCount);
      this.identificationOfNewInfo();
    }
  }

  componentWillUnmount() {
    this.focusListener.remove();
  }

  onDateChange = (date, type, options) => {
    // console.log('====================================')
    // console.log('onDateChange', date, type, options)
    // console.log('====================================')
    if (type === 'END_DATE') {
      this.setState({
        selectedEndDate: moment(date)
      });
      return null;
    }
    this.setState({
      selectedStartDate: options === 'allDay'
        ? moment(date).set({
          hour: 9, minute: 0, second: 0, millisecond: 0
        })
        : moment(date),
      selectedEndDate: options === 'allDay'
        ? moment(date).set({
          hour: 18, minute: 0, second: 0, millisecond: 0
        })
        : moment(date).add(1, 'hours')
    });
    return null;
  }

  changeSearchBarIsVisible = () => {
    const { searchBarIsVisible } = this.state;
    this.startAnimation();
    this.setState({ searchBarIsVisible: !searchBarIsVisible });
  }

  onMomentumScrollEnd = () => {
    const animatedFlatLists = [
      this.animatedFlatList1,
      this.animatedFlatList2,
      this.animatedFlatList3,
      this.animatedFlatList4
    ];
    animatedFlatLists.forEach(
      (item) => item.scrollToOffset({ animated: true, offset: 0 })
    );
  }

  setDateTimePickerVisible = (value) => {
    const { dateTimePickerIsVisible } = this.state;
    this.setState({ dateTimePickerIsVisible: value || !dateTimePickerIsVisible });
  }

  toBookFast = async () => {
    const { selectedStartDate, selectedEndDate } = this.state;
    // console.log('handleConfirm', new Date(selectedStartDate), new Date(selectedEndDate));
    const newBook = {
      office: this.officesId,
      date_from: new Date(selectedStartDate).toISOString(),
      date_to: new Date(selectedEndDate).toISOString()
    };
    const accessToken = await _retrieveData('access_token');
    api.toBookFast(accessToken, newBook)
      .then(
        ({ data }) => {
          // console.log('toBookFast', data);
          getAlert('Бронирование успешно создано', 'Не забудьте подтвердить ваше бронирование', () => this.goToMyBookingScreen(data));
        }
      )
      .catch(
        (err) => {
          // console.log('toBookFast', err, err.response);
          _errorHandler(err, this.toBookFast.bind(this));
        }
      );
  };

  goToMyBookingScreen = (data) => {
    const { navigation } = this.props;
    this.setDateTimePickerVisible();
    navigation.navigate('MyBooking', { booking: data });
  }

  handleMoreDetails = (value) => {
    // console.log('handleMoreDetails', value);
    this.setState({ listCount: value + 1 });
    this.setDateTimePickerVisible();
  }

  onValuePickerChange = (value) => {
    this.setState({ selectedPickerValue: value });
    // console.log('onValuePickerChange', value);
  }

  setAllDayTime = () => {
    const { selectedStartDate } = this.state;
    const newStartDate = moment(`${moment(selectedStartDate).format('YYYY-MM-DD')} 09:00:00`);
    const newEndDate = moment(`${moment(selectedStartDate).format('YYYY-MM-DD')} 18:00:00`);
    this.onDateChange(newStartDate);
    this.onDateChange(newEndDate, 'END_DATE');
  }

  onPressBack = () => {
    this.setState((prevState) => ({ listCount: prevState.listCount - 1 }));
  }

  getParamsOfScrollView = (event) => {
    this.horizontalScrollViewParams = event.nativeEvent.layout;
  }

  horizontalScrollViewScrollTo = (value) => {
    const { screenName } = this.state;
    if (screenName !== 'table' && value === 3) {
      return;
    }
    const newX = constants.window.width * value;
    this.horizontalScrollView.scrollTo({ x: newX, y: 0, animated: true });
  }

  _getTables = async () => {
    const { screenTitle } = this.state;
    const filter = this.filterString || '';
    const accessToken = await _retrieveData('access_token');
    return api.getTables(accessToken, this.roomId, filter, screenTitle)
      .then(
        async ({ data }) => {
          console.log('_getTables', data);
          return data;
        }
      )
      .catch(
        (err) => _errorHandler(err, this._getTables.bind(this))
      );
  }

  _getRooms = async () => {
    const { screenTitle } = this.state;
    const filter = this.filterString || '';
    const accessToken = await _retrieveData('access_token');
    return api.getRooms(accessToken, this.floorId, filter, screenTitle)
      .then(
        ({ data }) => data
      )
      .catch(
        (err) => _errorHandler(err, this._getRooms.bind(this))
      );
  }

  _getFloors = async () => {
    const { screenTitle } = this.state;
    const filter = this.filterString || '';
    const accessToken = await _retrieveData('access_token');

    return api.getFloors(accessToken, this.officesId, filter, screenTitle)
      .then(
        async ({ data }) => data
      )
      .catch(
        (err) => _errorHandler(err, this._getFloors.bind(this))
      );
  }

  _getOffices = async () => {
    const { search, screenTitle } = this.state;
    const filter = this.filterString || '';
    const accessToken = await _retrieveData('access_token');
    // console.table([
    //   ['this.count: ', this.count],
    //     ['this.startCount: ', this.startCount],
    //     ['this.count >= this.startCount: ', this.count >= this.startCount],
    //     ['responsIsReceived: ', 'responsIsReceived'],
    //     ['this.limit', this.limit]
    // ])
    if (!this.count || this.count >= this.startCount) {
      return api.getOffices(accessToken, this.startCount, search, filter, screenTitle)
        .then(
          ({ data }) => {
            console.log('getOffices', data);
            this.count = data.count;
            this.limit = data.limit;
            return data;
          }
        )
        .catch(
          (err) => _errorHandler(err, this._getOffices.bind(this))
        );
    }
    return null;
  }

  _getChips = async () => {
    const accessToken = await _retrieveData('access_token');
    return api.getTableTag(accessToken)
      .then(
        ({ data }) => data
      )
      .catch(
        (err) => _errorHandler(err, this._getFloors.bind(this))
      );
  }

  pressToOffices = (id) => {
    // console.log('pressToOffices', id);
    this.officesId = id;
    this.setDateTimePickerVisible();
  }

  pressToFloors = (id) => {
    this.floorId = id;
    // console.log('pressToFloors', id);
    this.setState({ listCount: 2 });
  }

  pressToRooms = (id) => {
    this.roomId = id;
    // console.log('pressToRooms', id);
    this.setState({ listCount: 3 });
  }

  pressToTables = (id) => {
    const { screenName, tables } = this.state;
    const { navigation } = this.props;
    // console.log('pressToTables', id);
    const table = tables.find(
      (item) => item.id === id
    );
    navigation.navigate('BookingChangeDate', { table, type: screenName });
  }

  startAnimation = () => {
    LayoutAnimation.configureNext({
      duration: 700,
      create: { type: 'linear', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.4 },
      delete: { type: 'spring', property: 'opacity' }
    });
  }

  pressToTitle = () => {
    // console.log('pressToTitle');
    const { screenIsOpen } = this.state;
    this.setState({ screenIsOpen: !screenIsOpen });
    this.startAnimation();
  }

  openNewScreen = (value) => {
    const { bookingTypes, listCount } = this.state;
    const { navigation } = this.props;
    // console.log('openNewScreen', value);
    if (value === 'myBooks') {
      navigation.navigate('MyBooking');
      return;
    }
    const newTitle = bookingTypes.find((item) => item.screenName === value);
    this.setState({
      screenTitle: newTitle.title,
      screenName: newTitle.screenName,
      screenIsOpen: false
    });
    if (listCount === 3) {
      this.setState({ listCount: 2 });
    }
  }

  changeFilter = (id) => {
    const { chips } = this.state;
    const newChips = chips;
    const indexChip = newChips.findIndex(
      (item) => item.id === id
    );
    newChips[indexChip].selected = !newChips[indexChip].selected;
    if (newChips[indexChip].selected) {
      this.filterString = this.filterString.concat(`tags=${newChips[indexChip].title}&`);
    } else {
      const stringToFind = this.filterString;
      this.filterString = stringToFind.replace(`tags=${newChips[indexChip].title}&`, '');
    }
    // console.log('this.filterString', this.filterString);
    this.setState({ chips: newChips });
    debounce(this.identificationOfNewInfo.bind(this), 1200);
    // this.identificationOfNewInfo();
  }

  identificationOfNewInfo = async () => {
    console.log('identificationOfNewInfo');
    const { listCount, screenName } = this.state;
    switch (listCount) {
      case 0: {
        this.startCount = 1;
        const newOffices = await this._getOffices() || { results: [] };
        console.log('newOffices', newOffices);
        this.setState({ offices: newOffices.results });
        break;
      }

      case 1: {
        const newFloors = await this._getFloors() || [];
        this.setState({ floors: newFloors });
        break;
      }

      case 2: {
        const newRooms = await this._getRooms() || { results: [] };
        this.setState({ rooms: newRooms.results });
        break;
      }

      case 3: {
        const newTables = await this._getTables() || { results: [] };
        this.setState({ tables: newTables.results });
        if (screenName !== 'table') {
          console.log('newTables', newTables);
          this.pressToTables(newTables.results[0]?.id);
          this.setState({ listCount: 2 }); // для кнопки назад
        }
        break;
      }

      default:
        break;
    }
  }

  _getData = async () => {
    console.log('_getData');
    const { isOnLayout } = this.state;
    this.setState({ isOnLayout: true });
    if (!isOnLayout) {
      await this._getTypes();
      const chips = await this._getChips() || [];
      const offices = await this._getOffices() || { results: [] };
      this.setState((prevState) => ({
        ...prevState,
        offices: [...prevState.offices, ...offices.results],
        isBookingReady: true,
        chips
      }));
    }
  }

  _getTypes = async () => {
    const bookingTypes = [{
      id: '0001',
      title: 'Рабочее место',
      screenName: 'table',
      selected: true
    },
    {
      id: '0002',
      title: 'Переговорная',
      screenName: 'meetingRoom',
      selected: false
    },
    {
      id: '0003',
      title: 'Мои бронирования',
      screenName: 'myBooks',
      selected: false
    }
    ];
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        this.setState({
          bookingTypes
          // isBookingReady: true
        });
        return resolve('Ok, nice!');
      }, 300);
    });
    const result = await promise;
    return result;
  }

  _onEndReached = async () => {
    console.log('_onEndReached');
    if (this.count && this.limit) {
      this.startCount += this.limit;
    }
    this.identificationOfNewInfo();
  }

  listCountToNull = () => {
    const { listCount } = this.state;
    if (listCount !== 0) {
      this.setState({ listCount: 0 });
      return;
    }
    this.identificationOfNewInfo();
  }

  updateSearch = (search) => {
    this.setState(({ search, offices: [] }));
    this.count = undefined;
    this.startCount = 1;
    this.limit = undefined;
    this.setState({ listCount: 0 });
    debounce(this.listCountToNull.bind(this), 500, true);
  }

  spin = () => {
    this.spinValue.setValue(0);
    setTimeout(() => {
      Animated.timing(
        this.spinValue,
        {
          toValue: 1,
          duration: 300,
          easing: Easing.cubic
        }
      ).start();
    }, 100);
  }

  render() {
    // console.log('render');
    const {
      isBookingReady,
      bookingTypes,
      screenTitle,
      search,
      screenIsOpen,
      chips,
      offices,
      searchBarIsVisible,
      floors,
      rooms,
      tables,
      listCount,
      dateTimePickerIsVisible,
      selectedStartDate,
      selectedEndDate,
      time
    } = this.state;
    const whenSearchBarIsVisible = screenIsOpen
      ? Constants.statusBarHeight + 300
      : Constants.statusBarHeight + 200;

    const whenSearchBarIsNotVisible = screenIsOpen
      ? Constants.statusBarHeight + 245
      : Constants.statusBarHeight + 145;

    const paddingTop = searchBarIsVisible
      ? whenSearchBarIsVisible
      : whenSearchBarIsNotVisible;

    // eslint-disable-next-line global-require
    const background = require('../assets/images/stats-bg.png');

    if (!isBookingReady) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors.background
          }}
          onLayout={this._getData}
        >
          <ActivityIndicator size="large" color={Colors.tintColor} />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.mainBgImageWrapper}>
          <Animated.Image
            style={[styles.mainBgImage, { transform: [{ translateX: this.spinIntepolate }] }]}
            source={background}
          />
        </View>

        <ScrollView
          scrollEnabled={false}
          ref={(ref) => { this.horizontalScrollView = ref; }}
          onLayout={this.getParamsOfScrollView}
          style={{ flex: 1 }}
          pagingEnabled
          onMomentumScrollEnd={this.onMomentumScrollEnd}
          horizontal
        >
          <FlatList
            ref={(list) => { this.animatedFlatList1 = list; }}
            onScroll={Animated.event([
              { nativeEvent: { contentOffset: { y: this._animatedHeaderValue } } }
            ])}
            scrollEventThrottle={16}
            onEndReached={this._onEndReached}
            onEndReachedThreshold={0.8}
            ListFooterComponent={<View style={{ height: 10 }} />}
            contentContainerStyle={{
              width: constants.window.width,
              paddingTop,
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
              })
            }}
            data={offices}
            renderItem={({ item, index }) => (
              <BuildingCard
                onPress={this.pressToOffices}
                item={item}
                index={index || 0}
                length={offices.length}
                title={item.title}
                description={item.description}
              />
            )}
            keyExtractor={(item) => item.id}
          />
          <FlatList
            ref={(list) => { this.animatedFlatList2 = list; }}
            onScroll={Animated.event([
              { nativeEvent: { contentOffset: { y: this._animatedHeaderValue } } }
            ])}
            scrollEventThrottle={16}
            ListFooterComponent={<View style={{ height: 10 }} />}
            contentContainerStyle={{
              width: constants.window.width,
              paddingTop,
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
              })
            }}
            data={floors}
            renderItem={({ item, index }) => (
              <FloorCard
                onPress={this.pressToFloors}
                type="floor"
                item={item}
                index={index || 0}
                length={floors.length}
                capacity_tables={item.capacity_tables}
                occupied_tables={item.occupied_tables}
                title={item.title}
                description={item.description}
              />
            )}
            keyExtractor={(item) => item.id}
          />
          <FlatList
            ref={(list) => { this.animatedFlatList3 = list; }}
            onScroll={Animated.event([
              { nativeEvent: { contentOffset: { y: this._animatedHeaderValue } } }
            ])}
            scrollEventThrottle={16}
            ListFooterComponent={<View style={{ height: 10 }} />}
            contentContainerStyle={{
              width: constants.window.width,
              paddingTop,
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
              })
            }}
            data={rooms}
            renderItem={({ item, index }) => (
              <FloorCard
                onPress={this.pressToRooms}
                type="room"
                item={item}
                index={index || 0}
                length={rooms.length}
                capacity_tables={item.capacity_tables}
                occupied_tables={item.occupied_tables}
                title={item.title}
                description={item.description}
              />
            )}
            keyExtractor={(item) => item.id}
          />
          <FlatList
            ref={(list) => { this.animatedFlatList4 = list; }}
            onScroll={Animated.event([
              { nativeEvent: { contentOffset: { y: this._animatedHeaderValue } } }
            ])}
            scrollEventThrottle={16}
            ListFooterComponent={<View style={{ height: 10 }} />}
            contentContainerStyle={{
              width: constants.window.width,
              paddingTop,
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
              })
            }}
            data={tables}
            renderItem={({ item, index }) => (
              <TableCard
                onPress={this.pressToTables}
                id={item.id}
                item={item}
                rating={item.rating}
                index={index || 0}
                length={tables.length}
                title={item.title}
                description={item.description}
              />
            )}
            keyExtractor={(item) => item.id}
          />
        </ScrollView>
        <Header
          startAnimation={this.startAnimation}
          _animatedHeaderValue={this._animatedHeaderValueInterpolate}
          changeSearchBarIsVisible={this.changeSearchBarIsVisible}
          searchBarIsVisible={searchBarIsVisible}
          style={{ width: constants.window.width }}
          search={search}
          updateSearch={this.updateSearch}
          chips={chips}
          changeFilter={this.changeFilter}
          pressToTitle={this.pressToTitle}
          openNewScreen={this.openNewScreen}
          screenTitle={screenTitle}
          screenIsOpen={screenIsOpen}
          bookingTypes={bookingTypes}
          backButton={listCount > 0}
          onPressBack={this.onPressBack}
          rightButtonIsVisible
          iconIsVisible
        />
        <BookingModal
          setAllDayTime={this.setAllDayTime}
          selectedStartDate={selectedStartDate}
          selectedEndDate={selectedEndDate}
          time={time}
          onDateChange={this.onDateChange}
          isVisible={dateTimePickerIsVisible}
          onConfirm={this.toBookFast}
          onCancel={() => this.setDateTimePickerVisible(false)}
          onMoreDetails={() => this.handleMoreDetails(listCount)}
          moreDetailsText="Подробнее"
          cancelText="Отмена"
          confirmText="Забронировать"
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  mainBgImageWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: Constants.statusBarHeight + 150,
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 50,
  },
  mainBgImage: {
    flex: 1,
    resizeMode: 'contain'
  },
  containerWrap: {
    minHeight: constants.window.height,
    marginHorizontal: 15,
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
  }
});

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
)(BookingScreen);
