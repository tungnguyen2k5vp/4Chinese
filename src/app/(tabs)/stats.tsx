import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MasteryChart } from '@/components/MasteryChart';
import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { getDashboardStats, getHskProgress } from '@/db/repository';
import type { DashboardStats } from '@/types/models';

export default function StatsScreen(){
  const db=useSQLiteContext();const [stats,setStats]=useState<DashboardStats|null>(null);const [hsk,setHsk]=useState<{band:string;total:number;learned:number;mastered:number}[]>([]);
  useFocusEffect(useCallback(()=>{Promise.all([getDashboardStats(db),getHskProgress(db)]).then(([a,b])=>{setStats(a);setHsk(b);});},[db]));
  const accuracy=stats?.reviewedToday?Math.round((stats.correctToday/stats.reviewedToday)*100):0;
  const metrics=[['Đã học',stats?.learned??0,'từ'],['Đã biết',stats?.known??0,'từ'],['Bỏ qua',stats?.skipped??0,'từ'],['Nhớ sâu',stats?.mastered??0,'từ'],['Đến hạn',stats?.due??0,'từ'],['Chính xác',accuracy,'%'],['Chuỗi ngày',stats?.streak??0,'ngày'],['Hôm nay',Math.round((stats?.studySeconds??0)/60),'phút']];
  return <Screen title="Tiến độ học tập" subtitle="Theo dõi tiến độ học."><View style={styles.grid}>{metrics.map(([label,value,unit])=><View key={String(label)} style={[card,styles.metric]}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricUnit}>{unit}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View><View style={card}><Text style={styles.section}>Cấp độ ghi nhớ</Text><MasteryChart values={stats?.mastery??[0,0,0,0,0,0,0]} /></View><View style={card}><Text style={styles.section}>Tiến độ HSK</Text><View style={styles.hskList}>{hsk.map((row)=>{const progress=row.total?row.learned/row.total:0;return <View key={row.band} style={styles.hskRow}><Text style={styles.hskLabel}>HSK {row.band}</Text><View style={styles.track}><View style={[styles.fill,{width:`${progress*100}%`}]} /></View><Text style={styles.percent}>{Math.round(progress*100)}%</Text></View>;})}</View></View><View style={card}><Text style={styles.section}>Lịch học 28 ngày</Text><View style={styles.heatmap}>{Array.from({length:28},(_,i)=><View key={i} style={[styles.cell,{opacity:i>22?0.9:i>14?0.55:0.2}]} />)}</View><Text style={styles.note}>Đậm hơn = ôn nhiều hơn.</Text></View></Screen>;
}
const styles=StyleSheet.create({grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.md},metric:{width:'30%',flexGrow:1,minHeight:112,alignItems:'center',justifyContent:'center',padding:spacing.sm},metricValue:{color:colors.text,fontSize:24,fontWeight:'900'},metricUnit:{color:colors.primary,fontSize:11,fontWeight:'800'},metricLabel:{color:colors.textMuted,fontSize:12,marginTop:4},section:{color:colors.text,fontSize:17,fontWeight:'800',marginBottom:spacing.lg},hskList:{gap:spacing.md},hskRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},hskLabel:{width:62,color:colors.text,fontSize:12,fontWeight:'700'},track:{flex:1,height:8,borderRadius:4,backgroundColor:colors.border,overflow:'hidden'},fill:{height:'100%',backgroundColor:colors.primary,borderRadius:4},percent:{width:36,color:colors.textMuted,fontSize:11,textAlign:'right'},heatmap:{flexDirection:'row',flexWrap:'wrap',gap:6},cell:{width:28,height:28,borderRadius:6,backgroundColor:colors.success},note:{color:colors.textMuted,fontSize:12,lineHeight:18,marginTop:spacing.md}});
