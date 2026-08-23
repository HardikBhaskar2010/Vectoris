const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, 'designs', 'stitch');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const screens = [
  {
    name: '01_Dashboard_Dark_Theme',
    title: 'Vectoris Intelligence Dashboard (Dark Mode)',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1VvKMCLG20-5mAF1gEuiGrnWAHD-nuAtt5SAsW5OZZPClxzm0qiwHXH04qa0asDyRZDqTeUHaniSOg26FUlp9vAJ9lGwdYvO6y-39PZf6N6BaLXkYJySHvNHBFdNdm06Sr-gUYR6ZSKOhf3Sg913DgMp5cFV7h6rezVBQnQOdLksnvnRMcrteBjjqioWbndL4O2f4F9ZDbaGuD7LaQKlL_rP3Z3hjO6U-K3dqpu9FOvAxItOzoIdnW4aL1T',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzhlZWIxYzllY2I0NjQ4YTY4MzhmZGU2MWMzZDc0M2U0EgsSBxCzv_qV0hYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODIwMjQyOTc2MzA1MDkzMTIwNQ&filename=&opi=96797242'
  },
  {
    name: '02_Dashboard_Light_Theme',
    title: 'Vectoris Official Light Dashboard',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1VJlKbH18C855P5w53acDwd2jw99WLml3IG99bYQin3QOR6Bqnct5bFcWnmmXsyLMsI4iu-FEz5mkzaXGjRGHS0V4ZkzL6016gu-e6QvXBfFGGzoD97iZaY4nMvVi3fJiUWfOvlnzsYJwdeA2-n48Wh7nR_TLq39XzgxPAUpagXDZDFbm_t5T2eZ_4N1PBCjDdMF6tWQc9taxAvnW7DTM5UI_SFZr7QEUL_gAvy0k8mVKjVEb8oZekCFcu9',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzI0NGRlNjdlOWRjZTRjODU5NmM3M2YxY2NiYTZkMDZhEgsSBxCzv_qV0hYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODIwMjQyOTc2MzA1MDkzMTIwNQ&filename=&opi=96797242'
  },
  {
    name: '03_Authentication_SignUp',
    title: 'Vectoris Sign Up & Split CAD Visual',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1VnXisZhfBAPbKsh2NligQaaoGnIGZSzDHf35KQhldiVTmAX7Wj4MGPpNqF72BoKH8-RQcAEpDd1p9vGSV4dHLzA5Tq7-8-wCxM3bH1bcpFibzmX4v6AULFlhXWb-PtEu15LBsObsW-qdUGT0Kx_Uosnib7POQmcOaBacEmZZ79kySYx_IRiG8d4O4yqRuuUlzoZfJRN-kw6FUXyJ9U6aezZm89PvYpvDgEZc4cBb9oFhPxw8mrpN9_vHw',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2NiOTU3OTA1YWIyMDQzYTU4ZWQ1OWYxNzUzMGRkMWU1EgsSBxCzv_qV0hYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODIwMjQyOTc2MzA1MDkzMTIwNQ&filename=&opi=96797242'
  },
  {
    name: '04_Drawing_Takeoff_Workspace',
    title: 'Vectoris Drawing & Takeoff Workspace (Core MVP)',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1Vs616sViUmnKOqbT5ISdSetrYWnW7C-L0ys11Y7slE0c00RKOvChbCaNrRwLDw68ooA4OgcTAPJQiLBKL_D9J1uVTkU8VRQlAKaApIwiYDrvEqlKyfkWL4lxritJnuzWMEobmfV9VAMahPHoSWN_4V66Rppb5xhPnJCB-KLmYC0I0GkwB93C3Uy7ot_W-KfGurPn7j3_C7m5C_mJm6opTJ99zuBT1QOmr1zp5hVRde1fhT0RQx3Fp0hTv-',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzM0OTE2MGZlZmFkODRlOTM5ZWIyOTNlMTlhM2EyZTc1EgsSBxCzv_qV0hYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODIwMjQyOTc2MzA1MDkzMTIwNQ&filename=&opi=96797242'
  },
  {
    name: '05_Document_Processing_Pipeline',
    title: 'Vectoris Document Processing Pipeline',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1UArCsKqFhRDyUhB-MwB2gdT_JzMksLx00D7JVZaYjT1pPajd-HaPTO29A5VWyhOEZV5s-HyMGeLkCpSd_1DHx1UFqYbBomEdQMa88h9J05qYdbYOQyGXZZ59CAAJRfZhlV3AgdfB2w6dk0L0wQcVhnuQFLAjuQVDLNk5OWovWagq-zHhfmzsiULYCspQ9gQamR_jMQ9U6ajD73Db1uWbu8cpjBYg7mNhqDt4UEyix9j-FLXrSlKyqmHpXA',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzA0OWNjMzdlM2YzNTRiMGM5MWE4NzI4YzgxMTQ0ZTk1EgsSBxCzv_qV0hYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODIwMjQyOTc2MzA1MDkzMTIwNQ&filename=&opi=96797242'
  },
  {
    name: '06_AI_Session_Agent_Chat',
    title: 'Vectoris AI Session & Agent Chat',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1WtsF6fPogLMKluOwrq1BuroohiXPj5ftaScmmGNSAklGzoz34Jm9uoAOoTbZdR665XAZ0rpgjOvDERlE2sFkGOlnjOPP5GgvDSWUI7CkbidZFU_g3iB6-mlntPbCQuTwF-y-Cpl2FhGcisgJAJtO-I8oEGMXoG4lx27P0XeAiRkfvNLlM-Q_i-ablVBDVr7kY158klcoh9mSzdsujDzGLxVnfOmvMnJgwZqbru4Jvi2g7fsCm49O7KlrQ',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzcyM2IxN2Q2YzYwODQzNGU5MWE1NzljODNkODMwYWVhEgsSBxCzv_qV0hYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODIwMjQyOTc2MzA1MDkzMTIwNQ&filename=&opi=96797242'
  },
  {
    name: '07_Projects_Library_Create_Modal',
    title: 'Vectoris Projects Library & Create Modal',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1VFBdYsWHUjtkB67T3eJV5D3M3-ysHI3C8Ek7Ar48cZDRmT9VOXjpTCyGq1d07VgprKt73LqN00toDHPwZ_PjMefYNwMTsJVs_QoYERuf-g_mG23_KKkjcRR7nwzeXicD3WJj_zJoyleCqSTCaPdgtdW2qactGGfJsKNjBbmosIOzQaU_MYHheceaXmbxwTDsXZVHLowz2frM0KTy_3oLRDOMdOt8TdesF9AuHPdycDflYoNMAtfSqed27Q',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzkzY2Y0NzQzNzdlNjQ0MTdhNzQxMTYyYTUzNjY3ZGRjEgsSBxCzv_qV0hYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODIwMjQyOTc2MzA1MDkzMTIwNQ&filename=&opi=96797242'
  },
  {
    name: '08_Takeoff_Review_BOQ_Export',
    title: 'Vectoris Takeoff Review & BOQ Export',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1VB5kE-p6V1PoM-vyufEgPpl1gPltU13smgGkttz8DG3pAtVUM-iRbIImXTWzXcpPmc2QLQ5INBNGUkDUy9vtMtiU4nNs-Nxt61t29dTcfHYFDm_soNT9qwYackYK9VzAPbNoNoXXPsOm7aQinQa3gj2Xyf12VQj1bZLEJUeCAPkq_rwnnbcxuFl2vwgs0dxurfhjEB3qkj4S3_sy1erqEGAd_lE0b5_zPZw5JFFlOipXZ48p7IaNk0uToc',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2RiMmM2OWU5NTEwOTRmMDY5ZWQ5N2IyY2QzOWMxN2ExEgsSBxCzv_qV0hYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODIwMjQyOTc2MzA1MDkzMTIwNQ&filename=&opi=96797242'
  },
  {
    name: '09_Landing_Product_Entry',
    title: 'Vectoris Landing & Product Entry',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1VpnfEYtOnubrDI376FQhbg4QtX3FcP9PDIuVoRRJiVQwyRXuKymZgJ-nSPKfBOA8KTcSvxqRjsA_FcwvOf7UfEMhLC8itP466n3Q2q8AwtK70cZttyaHeCnR8EdjrCanye_P2cI_rAQatlttEJNBnq_Hzt12fgHfdRCUbOtxovKUtWr-hh4Z0-ieqqQBxuQpzC-OcEOu1E2CTNuHExXuk3Y6AxjBfCtOYxobDSUITDQzs6vjonTVdNdaY',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzE1MGYxNDU5NzZhYTQ0MGE4NmE3NmFmZGNjOWM5ODJjEgsSBxCzv_qV0hYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODIwMjQyOTc2MzA1MDkzMTIwNQ&filename=&opi=96797242'
  },
  {
    name: '10_Isometric_CAD_Artwork',
    title: 'Vectoris Isometric CAD Blueprint Scene',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1VXMUNEEMhjsz75ykWdzauzbu-qT6dSS5e0b-MD3LdGzgagGfA-UisI30lGzBhc-0YhsJgqKAx3VUZEfMPWE4cXfNE6228LJniSAew_PEjFOaU92HFobyxkyFzdVXDNl9JURo-58kDvnB1i80Q-pzgceu57Wo3MaXvWrCgpZn5GmDD24NwAVZ7ZzDdnamql9VVUuxqSTTgcvViUanEQ_RJFz6qsEP3rQ57L0FHvsN3OPg3nSKl2Zd-lE3WY'
  },
  {
    name: '11_Vectoris_Logo_Mark',
    title: 'Vectoris Brand Logo Icon',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1X4WNjxkLGBEm90jgnidPxtIdWDF204N-xoHyAKA-9PgloennJyA_r0ZyPGfmZNEIKUXnTN9BPpz4YIo_WVTEbBor9ogX_nRHqYgIGYfQUlJCrEjutZQcoR2F0REmdEPFhGq_Vg_Jr24DA8GS24wyscz494rKsd11GGILkFmdhs1WxqXZn5ywo_PwFSs0hBEk0Onlc391zvywYlHi91FU75_HESV_xGU7NW9zmOZO3iBFuGts_RZ7d3lj9f'
  }
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: Status ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(destPath);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  console.log('Downloading all Stitch design screens and HTML bundles into:', targetDir);
  for (const s of screens) {
    if (s.screenshotUrl) {
      const imgPath = path.join(targetDir, `${s.name}.png`);
      try {
        await downloadFile(s.screenshotUrl, imgPath);
        console.log(`✓ Saved screenshot: ${s.name}.png`);
      } catch (e) {
        console.error(`✗ Error downloading screenshot for ${s.name}:`, e.message);
      }
    }
    if (s.htmlUrl) {
      const htmlPath = path.join(targetDir, `${s.name}.html`);
      try {
        await downloadFile(s.htmlUrl, htmlPath);
        console.log(`✓ Saved HTML code: ${s.name}.html`);
      } catch (e) {
        console.error(`✗ Error downloading HTML for ${s.name}:`, e.message);
      }
    }
  }
  console.log('All exports completed successfully!');
}

run();
