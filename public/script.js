document.addEventListener('DOMContentLoaded', async function () {
  
  console.log("DOM Loaded");
  console.log("Checking faceapi:", typeof faceapi);
  // ===== GET ELEMENTS =====
  const video = document.getElementById('js-video');
  const canvas = document.getElementById('js-canvas');
  const captureBtn = document.getElementById('js-captureBtn');
  const form = document.getElementById('js-registerForm');
  const statusText = document.getElementById('js-status');

  const previewImage = document.getElementById('js-previewImage');
  const previewPlaceholder = document.getElementById('js-previewPlaceholder');
  const messageBox = document.getElementById('js-message');
  const infoMatric = document.getElementById('js-infoMatric');
  const infoName = document.getElementById('js-infoName');
  const infoDepartment = document.getElementById('js-infoDepartment');
  const infoLevel = document.getElementById('js-infoLevel');
  const infoSession = document.getElementById('js-infoSession');

  const levelSelect = document.getElementById('js-level');
  const sessionSelect = document.getElementById('js-session');

const submitBtn = document.getElementById('js-submitBtn');

  const state = {
    cameraReady: false,
    modelsReady: false,
    faceCaptured: false
  };

  const setPreviewState = (captured, imageData) => {
    if (!previewImage || !previewPlaceholder) return;
    if (captured) {
      previewImage.src = imageData;
      previewImage.classList.remove('hidden');
      previewPlaceholder.classList.add('hidden');
    } else {
      previewImage.src = '';
      previewImage.classList.add('hidden');
      previewPlaceholder.classList.remove('hidden');
    }
  };

  const updateCaptureAvailability = () => {
    const ready = state.cameraReady && state.modelsReady;
    if (captureBtn) captureBtn.disabled = !ready;

    if (submitBtn) {
      submitBtn.disabled = !state.faceCaptured;
    }

    if (!ready) {
      if (state.cameraReady && !state.modelsReady) {
        setMessage('Camera ready. Loading models...', 'info');
        setStatus('Loading face models...');
      } else if (!state.cameraReady && state.modelsReady) {
        setMessage('Models loaded. Waiting for camera permission...', 'info');
        setStatus('Waiting for camera...');
      }
    } else if (!state.faceCaptured) {
      setMessage('Camera and models are ready. Position your face and click Capture.', 'success');
      setStatus('Ready to capture.');
    }
  };

  const setStatus = (text) => {
    if (statusText) {
      statusText.innerText = text;
    } else {
      console.log('STATUS:', text);
    }
  };

  const setMessage = (text, type = 'info') => {
    if (!messageBox) {
      console.log('MESSAGE:', text);
      return;
    }
    messageBox.innerText = text;
    messageBox.classList.remove('error', 'success');
    if (type === 'success') messageBox.classList.add('success');
    if (type === 'error') messageBox.classList.add('error');
  };

  const updateStudentInfo = ({
    matric_no,
    name,
    department,
    level,
    session
}) => {

    if (infoMatric) infoMatric.innerText = matric_no || '-';

    if (infoName) infoName.innerText = name || '-';

    if (infoDepartment) infoDepartment.innerText = department || '-';

    if (infoLevel) infoLevel.innerText = level || '-';

    if (infoSession) infoSession.innerText = session || '-';

};
    

  // ===== CAMERA =====
  if (captureBtn) captureBtn.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  setPreviewState(false);
  setMessage('Initializing camera and face models...');

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      state.cameraReady = true;
      updateCaptureAvailability();
      console.log('Camera started');
    })
    .catch(err => {
      console.error('Camera error:', err);
      setMessage('Unable to access camera. Please allow camera permissions and refresh.', 'error');
      setStatus('Camera access denied');
    });

  video.addEventListener('loadedmetadata', () => {
    console.log('Video ready ✅');
    if (video.srcObject) {
      state.cameraReady = true;
      updateCaptureAvailability();
    }
  });

  if (typeof faceapi === 'undefined') {
    console.error("face-api not loaded yet!");
    return;
}
    const MODEL_URL = '/models';

    async function loadModels() {
     try {
      setStatus('Loading models...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
 
      console.log("Models loaded from local /models folder");
      setStatus('Models loaded successfully. Ready to capture your face.');
     } catch (err) {
      console.error("Models loading error:", err);
      setStatus('Model loading failed. Check console for details.');
      throw err;
     }
    
  }

    await faceapi.tf.setBackend('cpu');
    await faceapi.tf.ready();
      
    await loadModels();
    async function loadSessions() {

    try {

        const response = await fetch('/sessions');

        const sessions = await response.json();

        sessionSelect.innerHTML =
            '<option value="">Select Session</option>';

        sessions.forEach(session => {

            sessionSelect.innerHTML += `

                <option value="${session.id}">

                    ${session.session_name}

                </option>

            `;

        });

    }

    catch (err) {

        console.error(err);

    }

}

await loadSessions();
    state.modelsReady = true;
    updateCaptureAvailability();

    const modelStatus = {
      tinyFaceDetectorLoaded: faceapi.nets.tinyFaceDetector.isLoaded,
      faceLandmark68NetLoaded: faceapi.nets.faceLandmark68Net.isLoaded,
      faceRecognitionNetLoaded: faceapi.nets.faceRecognitionNet.isLoaded
    };
    console.log("Model check:", JSON.stringify(modelStatus, null, 2));

  
  // ===== CAPTURE =====
  
  captureBtn.addEventListener('click', async () => {
    // check if video is ready
    if (video.readyState !== 4) {
      setMessage('Camera not ready yet. Please wait for the video to start.', 'error');
      return;
    }

    console.log('Trying to detect face...');
    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 512,
      scoreThreshold: 0.35
    });

    const detection = await faceapi
      .detectSingleFace(video, detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    console.log('Detection result:', detection);
    if (!detection) {
      console.warn('No face detected', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      });
      setMessage('No face detected. Adjust your position, lighting, and make sure your face is clearly visible.', 'error');
      return;
    }

    setMessage('Face captured successfully. You can now submit the registration form.', 'success');
    console.log('Face Descriptor:', detection.descriptor);
    window.faceDescriptor = detection.descriptor;
    state.faceCaptured = true;
    updateCaptureAvailability();

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, 300, 200);
    const imageData = canvas.toDataURL('image/png');
    window.capturedFace = imageData;
    setPreviewState(true, imageData);

    const matricInput = document.getElementById('js-matric_no');
    const nameInput = document.getElementById('js-name');
    const departmentInput = document.getElementById('js-department');
    const levelInput = document.getElementById('js-level');
      updateStudentInfo({

    matric_no: matricInput?.value,

    name: nameInput?.value,

    department: departmentInput?.value,

    level: levelInput?.value,

    session:
        sessionInput.options[
            sessionInput.selectedIndex
        ]?.text

});
    const sessionInput = document.getElementById('js-session');
    updateStudentInfo({
      matric_no: matricInput?.value,
      name: nameInput?.value,
      department: departmentInput?.value
    });
  });
 
  console.log(faceapi.nets);

  // ===== FORM SUBMIT =====
  form.addEventListener('submit', async function(event) {
    event.preventDefault();

    if (!window.faceDescriptor) {
      setMessage('Please capture your face before registering.', 'error');
      return;
    }

    const matricField = document.getElementById('js-matric_no');
    const nameField = document.getElementById('js-name');
    const departmentField = document.getElementById('js-department');

    const data = {

    matric_no: matricField?.value || '',

    name: nameField?.value || '',

    department: departmentField?.value || '',

    level: levelSelect.value,

    session_id: sessionSelect.value,

    face_data: window.capturedFace,

    face_descriptor:
        Array.from(window.faceDescriptor)

};
    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const responseText = await response.text();
      setMessage(responseText, response.ok ? 'success' : 'error');

      if (response.ok) {
        updateStudentInfo({

    ...data,

    session:
        sessionSelect.options[
            sessionSelect.selectedIndex
        ]?.text

});;
        state.faceCaptured = false;
        if (submitBtn) submitBtn.disabled = true;
        window.faceDescriptor = null;
        setPreviewState(false);
        setMessage('Registration successful. You can register another student when ready.', 'success');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setMessage('Registration failed. Check console for details.', 'error');
    }
  });
 
});