-- MySQL dump 10.13  Distrib 8.0.36, for Win64 (x86_64)
--
-- Host: localhost    Database: mydb
-- ------------------------------------------------------
-- Server version	8.0.34

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `post_info`
--

DROP TABLE IF EXISTS `post_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_info` (
  `nickname` varchar(45) NOT NULL,
  `category` varchar(45) NOT NULL,
  `mem_number` varchar(45) NOT NULL,
  `way` varchar(45) NOT NULL,
  `period` varchar(45) NOT NULL,
  `tech_stack` varchar(300) NOT NULL,
  `deadline` varchar(45) NOT NULL,
  `position` varchar(45) NOT NULL,
  `contact` varchar(45) NOT NULL,
  `introduce_title` text,
  `introduce_detail` text,
  KEY `nickname` (`nickname`),
  CONSTRAINT `post_info_ibfk_1` FOREIGN KEY (`nickname`) REFERENCES `member` (`nickname`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `post_info`
--

LOCK TABLES `post_info` WRITE;
/*!40000 ALTER TABLE `post_info` DISABLE KEYS */;
INSERT INTO `post_info` VALUES ('johnny','스터디','5','온라인','3개월','JavaScript, React, NodeJs','2024-06-01','프론트엔드','카카오톡 오픈채팅','React 스터디 모집','React를 배우고 싶으신 분들을 모집합니다.'),('janes','프로젝트','4','오프라인','2개월','Python, Django, MySQL','2024-06-05','백엔드','이메일','Django 프로젝트 팀원 모집','Python과 Django를 활용한 프로젝트를 진행합니다.'),('mikeb','스터디','6','온오프라인','1개월','Java, Spring','2024-06-10','백엔드','구글 폼','Spring Boot 스터디 모집','Spring Boot를 함께 공부할 팀원을 찾습니다.'),('emilyd','프로젝트','3','온라인','기간미정','Kotlin, Android','2024-06-15','안드로이드','이메일','안드로이드 개발 프로젝트','Kotlin을 활용한 안드로이드 앱 개발 프로젝트입니다.'),('chrisj','스터디','10명이상','전체','6개월이상','JavaScript, TypeScript','2024-06-20','프론트엔드','카카오톡 오픈채팅','JavaScript 심화 스터디','심화된 JavaScript와 TypeScript를 공부합니다.'),('jessw','프로젝트','5','오프라인','4개월','Go, Docker, Kubernetes','2024-06-25','데브옵스','구글 폼','DevOps 프로젝트 모집','Go와 Kubernetes를 사용한 DevOps 프로젝트입니다.'),('davidj','스터디','7','온라인','2개월','Vue, Firebase','2024-06-30','프론트엔드','이메일','Vue.js 스터디 모집','Vue.js를 배우고자 하는 분들을 모집합니다.'),('sarahm','프로젝트','8','온오프라인','5개월','Swift, iOS','2024-07-01','IOS','카카오톡 오픈채팅','iOS 앱 개발 프로젝트','Swift를 이용한 iOS 앱 개발 프로젝트입니다.'),('danielw','스터디','9','전체','3개월','React, NextJs','2024-07-05','프론트엔드','구글 폼','Next.js 스터디 모집','Next.js를 심도있게 공부할 팀원을 모집합니다.'),('lauram','프로젝트','2','온라인','기간미정','NodeJs, Express, MongoDB','2024-07-10','백엔드','이메일','Node.js 프로젝트 팀원 모집','Node.js와 Express를 사용한 프로젝트입니다.'),('jamest','스터디','4','오프라인','1개월','Python, Flask','2024-07-15','백엔드','카카오톡 오픈채팅','Flask 스터디 모집','Flask를 배우고자 하는 분들을 모집합니다.'),('oliviaa','프로젝트','6','온오프라인','3개월','Java, Spring, MySQL','2024-07-20','백엔드','구글 폼','Spring 프로젝트 팀원 모집','Java와 Spring을 사용한 프로젝트입니다.'),('lucast','스터디','3','온라인','4개월','ReactNative, GraphQL','2024-07-25','프론트엔드','이메일','React Native 스터디','React Native와 GraphQL을 공부할 팀원을 찾습니다.'),('avam','프로젝트','5','오프라인','6개월이상','JavaScript, React, AWS','2024-07-30','프론트엔드','카카오톡 오픈채팅','React 프로젝트 모집','React와 AWS를 사용한 대규모 프로젝트입니다.'),('ethanh','스터디','10명이상','전체','2개월','TypeScript, NextJs','2024-08-01','프론트엔드','구글 폼','TypeScript 스터디 모집','TypeScript를 심도있게 배우고자 하는 분들을 모집합니다.'),('sophial','프로젝트','4','온라인','3개월','Python, Django, PostgreSQL','2024-08-05','백엔드','이메일','Django 프로젝트 팀원 모집','Python과 Django를 활용한 백엔드 프로젝트입니다.'),('masonw','스터디','6','온오프라인','1개월','Java, Spring Boot','2024-08-10','백엔드','카카오톡 오픈채팅','Spring Boot 스터디 모집','Spring Boot를 배우고자 하는 분들을 모집합니다.'),('isabellah','프로젝트','7','오프라인','기간미정','Kotlin, Android, Firebase','2024-08-15','안드로이드','구글 폼','안드로이드 앱 프로젝트','Kotlin과 Firebase를 활용한 안드로이드 앱 프로젝트입니다.'),('loganc','스터디','5','전체','6개월이상','JavaScript, React, Redux','2024-08-20','프론트엔드','이메일','React 심화 스터디','React와 Redux를 심도있게 공부합니다.'),('miar','프로젝트','3','온라인','4개월','Go, Docker, Kubernetes','2024-08-25','데브옵스','카카오톡 오픈채팅','DevOps 프로젝트 모집','Go와 Kubernetes를 사용한 DevOps 프로젝트입니다.'),('alexl','스터디','4','온오프라인','2개월','Vue, Vuex','2024-08-30','프론트엔드','구글 폼','Vue.js 스터디 모집','Vue.js와 Vuex를 배우고자 하는 분들을 모집합니다.'),('ameliaw','프로젝트','8','오프라인','5개월','Swift, iOS, CoreData','2024-09-01','IOS','이메일','iOS 앱 개발 프로젝트','Swift와 CoreData를 이용한 iOS 앱 개발 프로젝트입니다.'),('beny','스터디','9','전체','3개월','React, NextJs, GraphQL','2024-09-05','프론트엔드','카카오톡 오픈채팅','Next.js 심화 스터디','Next.js와 GraphQL을 심도있게 공부합니다.'),('charlotteh','프로젝트','2','온라인','기간미정','NodeJs, Express, MongoDB','2024-09-10','백엔드','구글 폼','Node.js 프로젝트 팀원 모집','Node.js와 Express를 사용한 백엔드 프로젝트입니다.'),('henrya','스터디','6','오프라인','1개월','Python, Flask, SQLAlchemy','2024-09-15','백엔드','이메일','Flask 스터디 모집','Flask와 SQLAlchemy를 배우고자 하는 분들을 모집합니다.'),('ellasc','프로젝트','10명이상','온오프라인','6개월이상','Java, Spring, MySQL','2024-09-20','백엔드','카카오톡 오픈채팅','Spring 대규모 프로젝트','Java와 Spring을 사용한 대규모 프로젝트입니다.'),('jackk','스터디','7','전체','2개월','ReactNative, GraphQL, TypeScript','2024-09-25','프론트엔드','구글 폼','React Native 심화 스터디','React Native와 GraphQL을 심도있게 공부합니다.'),('gracew','프로젝트','4','온라인','3개월','JavaScript, React, AWS','2024-09-30','프론트엔드','이메일','React 프로젝트 팀원 모집','React와 AWS를 사용한 프로젝트입니다.'),('samuelg','스터디','5','오프라인','1개월','TypeScript, NextJs, Redux','2024-10-01','프론트엔드','카카오톡 오픈채팅','TypeScript 스터디 모집','TypeScript와 Redux를 심도있게 배우고자 하는 분들을 모집합니다.'),('victoriaa','프로젝트','3','온오프라인','2개월','Python, Django, PostgreSQL','2024-10-05','백엔드','구글 폼','Django 프로젝트 팀원 모집','Python과 Django를 활용한 백엔드 프로젝트입니다.');
/*!40000 ALTER TABLE `post_info` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-05-24 15:56:34
