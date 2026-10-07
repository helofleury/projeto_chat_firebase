import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Loading } from '../components/Loading';
import { NotificationProvider } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import type { RootStackParamList } from '../types/navigation';
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) return <Loading message="Carregando sessão..." />;

  return (
    <NotificationProvider userId={user?.uid ?? null}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator>
          {user ? (
            <>
              <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Nova conversa' }} />
              <Stack.Screen
                name="GroupForm"
                component={GroupFormScreen}
                options={({ route }) => ({ title: route.params?.groupId ? 'Editar grupo' : 'Novo grupo' })}
              />
              <Stack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
              <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </NotificationProvider>
  );
}
