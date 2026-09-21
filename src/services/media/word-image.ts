import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export async function pickAndPersistWordImage(): Promise<string | null> {
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[4,3],quality:0.82});
  if(result.canceled||!result.assets[0])return null;
  const source=new File(result.assets[0].uri);const directory=new Directory(Paths.document,'word-images');
  directory.create({intermediates:true,idempotent:true});
  const extension=result.assets[0].fileName?.split('.').pop()?.replace(/[^a-zA-Z0-9]/g,'')||'jpg';
  const destination=new File(directory,`word-${Date.now()}.${extension}`);
  await source.copy(destination,{overwrite:true});return destination.uri;
}
