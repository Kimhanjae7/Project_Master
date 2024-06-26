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
-- Table structure for table `member`
--

DROP TABLE IF EXISTS `member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member` (
  `user_id` varchar(45) NOT NULL,
  `user_pw` varchar(45) NOT NULL,
  `user_name` varchar(45) NOT NULL,
  `user_phone` varchar(45) NOT NULL,
  `nickname` varchar(45) NOT NULL,
  `job` varchar(45) DEFAULT NULL,
  `affiliation` varchar(45) DEFAULT NULL,
  `career` text,
  `introduce` text,
  `interest_stack` text,
  PRIMARY KEY (`nickname`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member`
--

LOCK TABLES `member` WRITE;
/*!40000 ALTER TABLE `member` DISABLE KEYS */;
INSERT INTO `member` VALUES ('user21','pass21','Alexander Lewis','010-1234-5680','alexl','기획자','Company H','3 years at Company H','Hi, I am Alexander.','SQL, MySQL, MongoDB'),('user22','pass22','Amelia Walker','010-2345-6791','ameliaw','PM','Company I','5 years at Company I','Hello, I am Amelia.','PHP, MySQL, FireBase'),('user14','pass14','Ava Martinez','010-4567-8902','avam','데브옵스','Restaurant A','6 years at Restaurant A','Hello, I am Ava.','Go, Kubernetes, Docker'),('user23','pass23','Benjamin Young','010-3456-7802','beny','데브옵스','Company J','6 years at Company J','Hi, I am Benjamin.','NodeJs, Express, MongoDB'),('user24','pass24','Charlotte Hall','010-4567-8913','charlotteh','PM','Company K','4 years at Company K','Hello, I am Charlotte.','JavaScript, TypeScript, React'),('user05','pass05','Chris Johnson','010-5678-9012','chrisj','기획자','Company E','4 years at Company E','Hi, I am Chris.','GraphQL, NodeJs, Express'),('user09','pass09','Daniel Wilson','010-9012-3456','danielw','안드로이드','Firm A','9 years at Firm A','Hi, I am Daniel.','PHP, MySQL, FireBase'),('user07','pass07','David Jones','010-7890-1234','davidj','디자이너','Company F','6 years at Company F','Hi, I am David.','Java, Spring, MySQL'),('user26','pass26','Ella Scott','010-6789-0135','ellasc','기획자','Company L','6 years at Company L','Hello, I am Ella.','Java, Spring, MySQL'),('user04','pass04','Emily Davis','010-4567-8901','emilyd','IOS','Company D','2 years at Company D','Hello, I am Emily.','Python, Django, MySQL'),('user15','pass15','Ethan Hernandez','010-5678-9013','ethanh','백엔드','Company G','5 years at Company G','Hi, I am Ethan.','AWS, Kubernetes, Docker'),('user28','pass28','Grace Wright','010-8901-2357','gracew','백엔드','Media A','5 years at Media A','Hello, I am Grace.','PHP, MySQL, FireBase'),('user25','pass25','Henry Allen','010-5678-9024','henrya','백엔드','Lab B','5 years at Lab B','Hi, I am Henry.','GraphQL, NodeJs, Express'),('user18','pass18','Isabella Harris','010-8901-2346','isabellah','기획자','Startup A','5 years at Startup A','Hello, I am Isabella.','TypeScript, NextJs, NestJs'),('user27','pass27','Jack King','010-7890-1246','jackk','IOS','Company M','7 years at Company M','Hi, I am Jack.','Java, Kotlin, Spring'),('user11','pass11','James Taylor','010-1234-5679','jamest','프론트엔드','Publisher A','3 years at Publisher A','Hi, I am James.','JavaScript, TypeScript, Vue'),('user02','pass02','Jane Smith','010-2345-6789','janes','디자이너','Company B','3 years at Company B','Hi, I am Jane.','Figma, Zeplin, React'),('user06','pass06','Jessica Williams','010-6789-0123','jessw','프론트엔드','School A','7 years at School A','Hello, I am Jessica.','JavaScript, React, NextJs'),('user01','pass01','John Doe','010-1234-5678','johnny','백엔드','Company A','5 years at Company A','Hello, I am John.','Java, Spring, MySQL'),('user10','pass10','Laura Moore','010-0123-4567','lauram','IOS','Hospital A','5 years at Hospital A','Hello, I am Laura.','Swift, Kotlin, ReactNative'),('user19','pass19','Logan Clark','010-9012-3457','loganc','백엔드','Garage A','6 years at Garage A','Hi, I am Logan.','Python, Django, MySQL'),('user13','pass13','Lucas Thomas','010-3456-7891','lucast','백엔드','Band A','10 years at Band A','Hi, I am Lucas.','Java, Spring, MySQL'),('user17','pass17','Mason White','010-7890-1235','masonw','프론트엔드','Airline A','7 years at Airline A','Hi, I am Mason.','JavaScript, NodeJs, Express'),('user20','pass20','Mia Robinson','010-0123-4568','miar','디자이너','Gallery A','4 years at Gallery A','Hello, I am Mia.','JavaScript, React, Figma'),('user03','pass03','Michael Brown','010-3456-7890','mikeb','PM','Company C','10 years at Company C','Hey, I am Michael.','Git, AWS, Kubernetes'),('user12','pass12','Olivia Anderson','010-2345-6780','oliviaa','디자이너','Studio A','4 years at Studio A','Hello, I am Olivia.','Figma, Zeplin, ReactNative'),('user29','pass29','Samuel Green','010-9012-3468','samuelg','프론트엔드','Company N','4 years at Company N','Hi, I am Samuel.','React, NextJs, GraphQL'),('user08','pass08','Sarah Miller','010-8901-2345','sarahm','데브옵스','Lab A','8 years at Lab A','Hello, I am Sarah.','Python, Go, MongoDB'),('user16','pass16','Sophia Lee','010-6789-0124','sophial','프론트엔드','Hospital B','8 years at Hospital B','Hello, I am Sophia.','JavaScript, React, NextJs'),('user30','pass30','Victoria Adams','010-0123-4579','victoriaa','디자이너','Company O','5 years at Company O','Hello, I am Victoria.','Figma, Zeplin, ReactNative');
/*!40000 ALTER TABLE `member` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-05-24 15:59:27
