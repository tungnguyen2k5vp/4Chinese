import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressRing } from '@/components/ProgressRing';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing } from '@/constants/design';
import { getHskProgress } from '@/db/repository';
import type { HskBand } from '@/types/models';

const bands: HskBand[] = [1,2,3,4,5,6,'7-9'];
export default function HskScreen(){
  const db=useSQLiteContext(); const [rows,setRows]=useState<{band:string;total:number;learned:number;mastered:number}[]>([]);
  useFocusEffect(useCallback(()=>{getHskProgress(db).then(setRows);},[db]));
  return <Screen title="Lộ trình HSK 3.0" subtitle="Đi từng bậc, ôn đúng nhịp và xây nền tảng vững chắc."><View style={styles.list}>{bands.map((band,index)=>{const row=rows.find((item)=>item.band===String(band));const total=row?.total??0;const learned=row?.learned??0;const progress=total?learned/total:0;return <Pressable key={String(band)} onPress={()=>router.push(`/(tabs)/vocabulary?band=${band}`)} style={styles.card}><View style={[styles.level,{backgroundColor:colors.hsk[index]}]}><Text style={styles.levelSmall}>HSK</Text><Text style={styles.levelText}>{band}</Text></View><View style={styles.copy}><Text style={styles.title}>HSK {band}</Text>{band==='7-9'?<Text style={styles.advanced}>Advanced Band</Text>:null}<Text style={styles.meta}>{total} từ · {row?.mastered??0} nhớ tốt</Text><View style={styles.track}><View style={[styles.fill,{width:`${progress*100}%`,backgroundColor:colors.hsk[index]}]} /></View><Text style={styles.learned}>{learned} / {total} đã học</Text></View><ProgressRing progress={progress} size={66} /></Pressable>;})}</View></Screen>;
}
const styles=StyleSheet.create({list:{gap:spacing.md},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.md,flexDirection:'row',alignItems:'center',gap:spacing.md},level:{width:58,height:72,borderRadius:radius.md,alignItems:'center',justifyContent:'center'},levelSmall:{color:'#fff',fontSize:10,fontWeight:'800'},levelText:{color:'#fff',fontSize:23,fontWeight:'900'},copy:{flex:1,gap:3},title:{color:colors.text,fontSize:17,fontWeight:'800'},advanced:{color:colors.primary,fontSize:11,fontWeight:'800'},meta:{color:colors.textMuted,fontSize:12},track:{height:5,borderRadius:3,backgroundColor:colors.border,overflow:'hidden',marginTop:5},fill:{height:'100%',borderRadius:3},learned:{color:colors.textMuted,fontSize:11,marginTop:2}});
