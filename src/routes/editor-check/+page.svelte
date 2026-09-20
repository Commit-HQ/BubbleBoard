<script lang="ts">
import EventPhotoEditor from '$lib/app/EventPhotoEditor.svelte';
import { setApp, type App } from '$lib/app/state.svelte';
import sample from '$lib/assets/photos/classroom-800.webp';
const classrooms=[{id:'demo',name:'Mjehurići'}];
const children=['Ana','Luka','Petra','Marko','Mia','Ivan','Ema','Niko'].map((name,i)=>({id:String(i),name,classroom:'demo',families:[]}));
setApp({myClassrooms:classrooms,catalog:{children}} as unknown as App);
async function addSample(){const blob=await(await fetch(sample)).blob();const input=document.querySelector('input[type=file]') as HTMLInputElement;const transfer=new DataTransfer();transfer.items.add(new File([blob],'stock.webp',{type:blob.type}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}
</script>
<main class="mx-auto max-w-6xl p-6"><button onclick={addSample}>Test: učitaj stock fotografiju</button><EventPhotoEditor locale="hr" /></main>
