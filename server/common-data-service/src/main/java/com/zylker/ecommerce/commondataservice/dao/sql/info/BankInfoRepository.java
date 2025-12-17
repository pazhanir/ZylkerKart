package com.zylker.ecommerce.commondataservice.dao.sql.info;

import com.zylker.ecommerce.commondataservice.entity.sql.info.BankInfo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankInfoRepository extends JpaRepository<BankInfo, Integer> {

}
