import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { API_URL } from './src/config';

const C = { bg:'#10091C', panel:'#1D1230', panel2:'#291840', purple:'#B76CFF', text:'#F7F0FF', muted:'#B6A4C9', green:'#55E6A5', red:'#FF7894', line:'#39244D' };
const styles = {
  screen:{flex:1,backgroundColor:C.bg,paddingTop:Platform.OS==='android'?StatusBar.currentHeight:0},
  header:{padding:18,borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:C.panel},
  brand:{color:C.text,fontSize:25,fontWeight:'900',letterSpacing:1},
  subtitle:{color:C.muted,marginTop:4},
  title:{color:C.text,fontSize:22,fontWeight:'800',marginBottom:6},
  input:{backgroundColor:C.panel2,color:C.text,padding:14,borderRadius:13,marginTop:10,borderWidth:1,borderColor:C.line},
  button:{backgroundColor:C.purple,padding:14,borderRadius:13,alignItems:'center',marginTop:12},
  buttonText:{color:'#180A25',fontWeight:'900',fontSize:15},
  ghost:{padding:12,alignItems:'center'},
  ghostText:{color:C.purple,fontWeight:'700'},
  error:{color:C.red,marginTop:10},
  card:{padding:16,marginHorizontal:12,marginTop:10,borderRadius:14,backgroundColor:C.panel,flexDirection:'row',alignItems:'center'},
  avatar:{width:46,height:46,borderRadius:23,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center',marginRight:12},
  avatarText:{color:C.purple,fontSize:20,fontWeight:'900'},
  userName:{color:C.text,fontSize:16,fontWeight:'800'},
  muted:{color:C.muted,marginTop:3},
  bubble:{maxWidth:'85%',padding:12,borderRadius:16,marginVertical:5,backgroundColor:C.panel2},
  mine:{backgroundColor:'#5D2B85',alignSelf:'flex-end'},
  theirs:{alignSelf:'flex-start',borderWidth:1,borderColor:C.line},
  messageText:{color:C.text,fontSize:15},
  composer:{flexDirection:'row',padding:10,borderTopWidth:1,borderTopColor:C.line,alignItems:'center',gap:8},
  send:{backgroundColor:C.purple,paddingHorizontal:18,paddingVertical:13,borderRadius:14},
};
export default function App() {
  const [token,setToken]=useState(null), [me,setMe]=useState(null), [mode,setMode]=useState('login');
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[displayName,setDisplayName]=useState('');
  const [users,setUsers]=useState([]),[active,setActive]=useState(null),[messages,setMessages]=useState([]),[draft,setDraft]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const socketRef=useRef(null);
  const request=async(path,opts={})=>{
    const res=await fetch(`${API_URL}${path}`,{...opts,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} :{}),...(opts.headers||{})}});
    const data=await res.json().catch(()=>({error:'Respons server tidak terbaca.'}));
    if(!res.ok) throw new Error(data.error||'Permintaan gagal.');
    return data;
  };
  useEffect(()=>{AsyncStorage.getItem('vyn_token').then(t=>{if(t)setToken(t);});},[]);
  useEffect(()=>{if(!token)return;loadUsers();},[token]);
  const loadUsers=async()=>{try{const d=await request('/api/users');setUsers(d.users||[]);}catch(e){setError(e.message);}};
  const submitAuth=async()=>{
    setBusy(true);setError('');
    try{
      const d=await fetch(`${API_URL}/api/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,displayName:displayName||username})});
      const result=await d.json();if(!d.ok)throw new Error(result.error||'Login gagal.');
      await AsyncStorage.setItem('vyn_token',result.token);await AsyncStorage.setItem('vyn_user',JSON.stringify(result.user));setMe(result.user);setToken(result.token);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  useEffect(()=>{
    if(!token)return;
    let alive=true;
    AsyncStorage.getItem('vyn_user').then(s=>{if(alive&&s)setMe(JSON.parse(s));});
    return()=>{alive=false;};
  },[token]);
  useEffect(()=>{
    if(!token)return;
    let s;
    try{s=io(API_URL,{auth:{token},transports:['websocket','polling']});socketRef.current=s;
      s.on('message:new',m=>{if(active && ((m.senderId===active.id)||(m.receiverId===active.id)))setMessages(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m]);});
      s.on('connect_error',()=>setError('Koneksi chat terputus. Periksa URL server dan internet.'));
    }catch{}
    return()=>{s?.disconnect();};
  },[token,active?.id]);
  const openChat=async u=>{
    setActive(u);setError('');
    try{const d=await request(`/api/messages/${u.id}`);setMessages(d.messages||[]);}catch(e){setMessages([]);setError(e.message);}
  };
  const send=()=>{
    const body=draft.trim();if(!body||!active||!socketRef.current)return;
    setDraft('');
    socketRef.current.emit('message:send',{receiverId:active.id,body},ack=>{if(!ack?.ok)setError(ack?.error||'Pesan gagal dikirim.');});
  };
  const logout=async()=>{socketRef.current?.disconnect();await AsyncStorage.multiRemove(['vyn_token','vyn_user']);setToken(null);setMe(null);setActive(null);setMessages([]);};
  const saveUser=async u=>{setMe(u);await AsyncStorage.setItem('vyn_user',JSON.stringify(u));};
  // The server login response supplies user; persist it when token changes via a separate key in submitAuth.
  if(!token) return <SafeAreaView style={styles.screen}><View style={styles.header}><Text style={styles.brand}>VYNCHAT</Text><Text style={styles.subtitle}>Connect beyond distance.</Text></View><View style={{padding:22,flex:1,justifyContent:'center'}}><Text style={styles.title}>{mode==='login'?'Selamat datang kembali':'Buat akun baru'}</Text><Text style={styles.subtitle}>Chat real-time dari mana saja.</Text>{mode==='register'&&<TextInput placeholder="Nama tampilan" placeholderTextColor={C.muted} value={displayName} onChangeText={setDisplayName} style={styles.input}/>}<TextInput placeholder="Username" placeholderTextColor={C.muted} autoCapitalize="none" value={username} onChangeText={setUsername} style={styles.input}/><TextInput placeholder="Password (minimal 8 karakter)" placeholderTextColor={C.muted} secureTextEntry value={password} onChangeText={setPassword} style={styles.input}/><TouchableOpacity style={styles.button} onPress={submitAuth} disabled={busy}><Text style={styles.buttonText}>{busy?'Tunggu...':mode==='login'?'MASUK':'DAFTAR'}</Text></TouchableOpacity><TouchableOpacity style={styles.ghost} onPress={()=>{setMode(mode==='login'?'register':'login');setError('');}}><Text style={styles.ghostText}>{mode==='login'?'Belum punya akun? Daftar':'Sudah punya akun? Masuk'}</Text></TouchableOpacity>{!!error&&<Text style={styles.error}>{error}</Text>}</View></SafeAreaView>;
  return <SafeAreaView style={styles.screen}><View style={styles.header}><Text style={styles.brand}>VYNCHAT</Text><Text style={styles.subtitle}>{active?`Chat dengan @${active.username}`:'Pesan pribadi • Real-time'}</Text></View>{active?<KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><View style={{flexDirection:'row',alignItems:'center',padding:10}}><TouchableOpacity onPress={()=>setActive(null)}><Text style={styles.ghostText}>‹ Kembali</Text></TouchableOpacity><View style={{flex:1}}/><TouchableOpacity onPress={()=>loadUsers()}><Text style={styles.ghostText}>Muat ulang</Text></TouchableOpacity></View><FlatList style={{flex:1,paddingHorizontal:12}} data={messages} keyExtractor={m=>m.id} renderItem={({item})=><View style={[styles.bubble,item.senderId===me?.id?styles.mine:styles.theirs]}><Text style={styles.messageText}>{item.body}</Text><Text style={{color:'#D4B8E8',fontSize:10,marginTop:5}}>{new Date(item.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</Text></View>} contentContainerStyle={{paddingBottom:10}}/><View style={styles.composer}><TextInput placeholder="Tulis pesan..." placeholderTextColor={C.muted} value={draft} onChangeText={setDraft} style={[styles.input,{flex:1,marginTop:0,borderRadius:22}]} multiline/><TouchableOpacity style={styles.send} onPress={send}><Text style={styles.buttonText}>Kirim</Text></TouchableOpacity></View>{!!error&&<Text style={styles.error}>{error}</Text>}</KeyboardAvoidingView>:<><View style={{padding:16,flexDirection:'row',alignItems:'center'}}><View style={{flex:1}}><Text style={styles.title}>Pesan</Text><Text style={styles.subtitle}>Pilih pengguna untuk mulai chat</Text></View><TouchableOpacity onPress={logout}><Text style={styles.ghostText}>Keluar</Text></TouchableOpacity></View><FlatList data={users} keyExtractor={u=>u.id} onRefresh={loadUsers} refreshing={false} ListEmptyComponent={<View style={{padding:24,alignItems:'center'}}><ActivityIndicator color={C.purple}/><Text style={styles.subtitle}>Belum ada pengguna lain. Buat akun di HP kedua.</Text></View>} renderItem={({item})=><TouchableOpacity style={styles.card} onPress={()=>openChat(item)}><View style={styles.avatar}><Text style={styles.avatarText}>{item.displayName?.[0]?.toUpperCase()||'V'}</Text></View><View><Text style={styles.userName}>{item.displayName}</Text><Text style={styles.muted}>@{item.username}</Text></View></TouchableOpacity>}/>{!!error&&<Text style={styles.error}>{error}</Text>}</>}</SafeAreaView>;
}

