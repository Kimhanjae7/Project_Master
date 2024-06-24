document.addEventListener('DOMContentLoaded', function() {
    var editButton = document.getElementById('editButton');
    var saveButton = document.getElementById('saveButton');
    var cancelButton = document.getElementById('cancelButton');
    var nickname = document.getElementById('nickname');
    var link = document.getElementById('link');
    var affiliation = document.getElementById('affiliation');
    var job = document.getElementById('job');
    var experience = document.getElementById('experience');
    var stackInput = document.getElementById('stackInput');
    var selfIntroduction = document.getElementById('selfIntroduction');
    var contact = document.getElementById('contact');
    var fileInput = document.querySelector('input[type="file"]'); // 파일 입력 요소
    var profileImage = document.getElementById('profileImage'); // 프로필 이미지 요소
    var originalImageSrc = profileImage.src; // 원래 이미지 경로 저장
    var uploadedImage = null; // 업로드된 이미지 경로를 저장할 변수

    var nicknameInput = document.getElementById('nicknameInput');
    var linkInput = document.getElementById('linkInput');
    var affiliationInput = document.getElementById('affiliationInput');
    var jobInput = document.getElementById('jobInput');
    var experienceInput = document.getElementById('experienceInput');
    var selfIntroductionInput = document.getElementById('selfIntroductionInput');
    var contactInput = document.getElementById('contactInput');
    
    editButton.addEventListener('click', function() {
        toggleEdit(true);
    });

    cancelButton.addEventListener('click', function() {
        toggleEdit(false);
        // 이미지 변경을 취소하고 원래 이미지로 복원
        profileImage.src = originalImageSrc;
        fileInput.value = ''; // 파일 입력 요소 초기화
    });

    saveButton.addEventListener('click', function() {
        toggleEdit(false);
        // 여기에 서버로 변경된 정보를 전송하는 코드를 추가합니다.
        nickname.textContent = nicknameInput.value;
        link.textContent = linkInput.value;
        affiliation.textContent = affiliationInput.value;
        job.textContent = jobInput.value;
        experience.textContent = experienceInput.value;
        selfIntroduction.textContent = selfIntroductionInput.value;
        contact.textContent = contactInput.value;
        if (uploadedImage) {
            profileImage.src = uploadedImage; // 프로필 이미지를 업로드된 이미지로 변경
            originalImageSrc = uploadedImage; // 원래 이미지 경로를 업로드된 이미지 경로로 업데이트
        }
    });

    function toggleEdit(editing) {
        nickname.style.display = editing ? 'none' : 'inline';
        link.style.display = editing ? 'none' : 'inline';
        affiliation.style.display = editing ? 'none' : 'inline';
        job.style.display = editing ? 'none' : 'inline';
        experience.style.display = editing ? 'none' : 'inline';
        stackInput.style.display = editing ? 'inline' : 'none';
        selfIntroduction.style.display = editing ? 'none' : 'block';
        contact.style.display = editing ? 'none' : 'inline';
        fileInput.style.display = editing ? 'block' : 'none'; // 파일 입력 요소의 display 스타일 조정
        
        nicknameInput.style.display = editing ? 'inline' : 'none';
        linkInput.style.display = editing ? 'inline' : 'none';
        affiliationInput.style.display = editing ? 'inline' : 'none';
        jobInput.style.display = editing ? 'inline' : 'none';
        experienceInput.style.display = editing ? 'inline' : 'none';
        selfIntroductionInput.style.display = editing ? 'block' : 'none';
        contactInput.style.display = editing ? 'inline' : 'none';

        nicknameInput.value = nickname.textContent;
        linkInput.value = link.textContent;
        affiliationInput.value = affiliation.textContent;
        jobInput.value = job.textContent;
        experienceInput.value = experience.textContent;
        selfIntroductionInput.value = selfIntroduction.textContent;
        contactInput.value = contact.textContent;
        
        editButton.style.display = editing ? 'none' : 'block';
        saveButton.style.display = editing ? 'block' : 'none';
        cancelButton.style.display = editing ? 'block' : 'none';
    }

    window.loadFile = function(input) {
        let file = input.files[0]; // 선택파일 가져오기

        if (file) {
            let newImage = document.createElement("img"); // 새 이미지 태그 생성

            // 이미지 source 가져오기
            newImage.src = URL.createObjectURL(file);
            newImage.style.width = "90%"; // div에 꽉차게 넣지 않기 위해
            newImage.style.height = "90%";
            newImage.style.objectFit = "contain"; // div에 넘치지 않고 들어가게
            newImage.style.borderRadius = "50%"; // 이미지 둥글게

            // 이미지를 image-show div에 추가
            let container = document.getElementById('image_show');
            container.innerHTML = ''; // 기존 내용을 모두 삭제
            container.appendChild(newImage);

            // 업로드된 이미지 경로 저장
            uploadedImage = newImage.src;
        }
    }
});