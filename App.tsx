import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PantryScreen from './src/screens/PantryScreen';
import PlannerScreen from './src/screens/PlannerScreen';
import RecipesScreen from './src/screens/RecipesScreen';
import ShoppingScreen from './src/screens/ShoppingScreen';
import { StoreProvider, useStore } from './src/store';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Plan: 'calendar-outline',
  Recipes: 'book-outline',
  Pantry: 'basket-outline',
  Shopping: 'cart-outline',
};

// React Navigation draws a round, unclipped ripple on Android that spills out of the button and under
// the system navigation bar. A bounded ripple stays inside the tab.
const TabButton = (props: BottomTabBarButtonProps) => (
  <PlatformPressable {...props} android_ripple={{ borderless: false, color: colors.accentSoft }} />
);

function Root() {
  const { ready } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.inkSoft,
          tabBarIcon: ({ color, size }) => <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />,
          tabBarButton: TabButton,
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        })}
      >
        <Tab.Screen name="Plan" component={PlannerScreen} />
        <Tab.Screen name="Recipes" component={RecipesScreen} />
        <Tab.Screen name="Pantry" component={PantryScreen} />
        <Tab.Screen name="Shopping" component={ShoppingScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
