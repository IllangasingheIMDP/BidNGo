first you need to install ballerina
https://ballerina.io/downloads/
then if you are in uom wifi,
  in db.bal in backend/modules/db,
  put db.wkjheqsekenkoowlqecy.supabase.co as host 
  and postgres as username

if you are in  personal hotspot,
  put aws-1-ap-southeast-1.pooler.supabase.com as hostname and
  postgres.wkjheqsekenkoowlqecy as username
then you have to go to backend directory and run 
```
bal run --watch
```
then if you are using personal hotspot,
copy your pc's ip and then in the api.ts in the frontend
as base url,put http://ip:9000
and ip for ws host in api.ts file

if you are using uom wifi
in the vs code in ports
<img width="1513" height="312" alt="image" src="https://github.com/user-attachments/assets/251b56fb-d65e-4276-9459-2c245a0dee69" />
put 9000 in and then hit forward port.once the url generated right click on it and then change the port visibility into public
then copy the url and put that in api.ts base url without the last "/".like
https://sjt6dkzd-9000.inc1.devtunnels.ms


then in the frontend,
```
npm i
npx expo run:android
```

