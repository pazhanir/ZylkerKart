package com.zylker.ecommerce.commondataservice.service.interfaces;

import com.zylker.ecommerce.commondataservice.dto.ProductInfoDTO;
import com.zylker.ecommerce.commondataservice.entity.sql.info.ProductInfo;
import com.zylker.ecommerce.commondataservice.model.FilterAttributesResponse;
import com.zylker.ecommerce.commondataservice.model.HomeTabsDataResponse;
import com.zylker.ecommerce.commondataservice.model.MainScreenResponse;
import com.zylker.ecommerce.commondataservice.model.SearchSuggestionResponse;

import java.util.HashMap;

public interface CommonDataService {

    MainScreenResponse getHomeScreenData(String apiName);

    FilterAttributesResponse getFilterAttributesByProducts(String queryParams);

    ProductInfoDTO getProductsByCategories(String queryParams);

    HashMap<Integer, ProductInfo> getProductsById(String queryParams);

    HomeTabsDataResponse getBrandsAndApparelsByGender(String apiName);

    SearchSuggestionResponse getSearchSuggestionList();
}
